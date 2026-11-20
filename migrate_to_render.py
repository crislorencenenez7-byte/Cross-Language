import json
import urllib.request
import urllib.error
from pathlib import Path

API = "https://cross-studio-api.onrender.com/api"
ROOT = Path(__file__).resolve().parent

def request(method, path, data=None):
    url = API + path
    body = None

    headers = {}
    if data is not None:
        body = json.dumps(data, ensure_ascii=False).encode()
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        url, data=body, headers=headers, method=method
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail}")

def post(path, data):
    result = request("POST", path, data)
    if result.get("success") is not True:
        raise RuntimeError(str(result))
    return result

def main():
    print("Checking Render backend...")
    health = request("GET", "/health")
    if health.get("status") != "online":
        raise RuntimeError("Render backend is not online.")

    with __import__("sqlite3").connect(
        ROOT / "database" / "cross.db"
    ) as db:
        db.row_factory = __import__("sqlite3").Row
        projects = db.execute("""
            SELECT id, name, description, project_type, folder
            FROM projects ORDER BY id
        """).fetchall()

    existing = request("GET", "/projects").get("projects", [])

    print("Local projects:", len(projects))
    print("Existing Render projects:", len(existing))

    for project in projects:
        name = project["name"]
        description = project["description"] or ""
        project_type = project["project_type"]
        local_dir = ROOT / "projects" / project["folder"]

        if not local_dir.is_dir():
            raise RuntimeError(f"Missing local folder: {local_dir}")

        matches = [p for p in existing if p["name"] == name]

        if matches:
            remote = matches[0]
            if (
                remote.get("description", "") != description
                or remote.get("project_type") != project_type
            ):
                raise RuntimeError(
                    f"Existing project '{name}' does not match. "
                    "Stopping to protect remote data."
                )
            project_id = remote["id"]
            print(f"Resuming existing project: {name}")
        else:
            result = post("/projects", {
                "name": name,
                "description": description,
                "type": project_type
            })
            project_id = result["project"]["id"]
            print(f"Created: {name} (ID {project_id})")

        tree = request("GET", f"/projects/{project_id}/tree")
        if tree.get("success") is not True:
            raise RuntimeError(f"Cannot read remote tree for {name}")

        remote_items = {
            item["path"]: item["type"]
            for item in tree.get("items", [])
        }

        files = sorted(p for p in local_dir.rglob("*") if p.is_file())

        for local_file in files:
            relative = local_file.relative_to(local_dir).as_posix()
            parts = relative.split("/")
            current = ""

            for folder in parts[:-1]:
                current = f"{current}/{folder}".lstrip("/")
                if current not in remote_items:
                    post(f"/projects/{project_id}/items", {
                        "path": current,
                        "type": "folder"
                    })
                    remote_items[current] = "folder"

            content = local_file.read_text(encoding="utf-8")

            if relative == "project.json":
                metadata = json.loads(content)
                metadata["id"] = project_id
                content = json.dumps(
                    metadata, indent=2, ensure_ascii=False
                ) + "\n"

            if relative not in remote_items:
                post(f"/projects/{project_id}/items", {
                    "path": relative,
                    "type": "file"
                })

            post(f"/projects/{project_id}/file", {
                "path": relative,
                "content": content
            })

            print("  Uploaded:", relative)

        verify = request("GET", f"/projects/{project_id}/tree")
        remote_paths = {
            item["path"] for item in verify.get("items", [])
        }
        expected = {
            p.relative_to(local_dir).as_posix() for p in files
        }

        missing = expected - remote_paths
        if missing:
            raise RuntimeError(f"Verification failed: {missing}")

        print(f"Verified: {name} ({len(expected)} files)")

    print("\nMIGRATION FINISHED")
    print("Check the CROSS Studio website.")

if __name__ == "__main__":
    main()
