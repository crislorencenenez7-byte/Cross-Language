import json
import re
import traceback
from pathlib import Path
from urllib.parse import urlsplit, unquote
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from database import initialize, DB_PATH, ROOT, PROJECTS_DIR, connect

import os

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8300"))

PROJECT_TYPES = {"web", "2d", "3d", "blank"}
MAX_BODY = 1024 * 1024 + 16 * 1024


def make_slug(name):
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return slug[:40] or "project"


def create_project_files(project_id, name, description, project_type):
    folder_name = f"{project_id}-{make_slug(name)}"
    project_dir = PROJECTS_DIR / folder_name
    source_dir = project_dir / "src"

    source_dir.mkdir(parents=True, exist_ok=False)

    metadata = {
        "id": project_id,
        "name": name,
        "description": description,
        "type": project_type,
        "version": "3.0.0",
        "languages": ["X", "X#", "XS"],
        "entry_points": {
            "X": "src/main.x",
            "X#": "src/main.xsharp",
            "XS": "src/main.xs"
        }
    }

    (project_dir / "project.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8"
    )

    (project_dir / "README.md").write_text(
        f"# {name}\n\n"
        f"{description}\n\n"
        f"Project type: {project_type}\n\n"
        "Created with CROSS Studio 3.0.\n",
        encoding="utf-8"
    )

    # Separate entry files preserve the three language roles.
    (source_dir / "main.x").write_text("", encoding="utf-8")
    (source_dir / "main.xsharp").write_text("", encoding="utf-8")
    (source_dir / "main.xs").write_text("", encoding="utf-8")

    return folder_name


class CrossHandler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")

        origin = self.headers.get("Origin", "")
        allowed_origins = {
            "http://127.0.0.1:8301",
            "http://localhost:8301",
            "https://crislorencenenez7-byte.github.io"
        }

        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Invalid Content-Length.")

        if length <= 0 or length > MAX_BODY:
            raise ValueError("Request body is empty or too large.")

        raw = self.rfile.read(length)

        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("Invalid JSON request.")

        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object.")

        return data

    def do_OPTIONS(self):
        self.send_json(200, {"success": True})

    def do_GET(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"

        if path == "/api/health":
            self.send_json(200, {
                "success": True,
                "system": "CROSS 3.0",
                "status": "online",
                "database": DB_PATH.exists()
            })
            return

        if path == "/api/projects":
            self.list_projects()
            return

        match = re.fullmatch(r"/api/projects/(\d+)", path)
        if match:
            self.get_project(int(match.group(1)))
            return

        self.send_json(404, {
            "success": False,
            "error": "Endpoint not found"
        })

    def do_POST(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"

        if path == "/api/projects":
            self.create_project()
            return

        match = re.fullmatch(r"/api/projects/(\d+)/files", path)
        if match:
            self.save_project_file(int(match.group(1)))
            return

        self.send_json(404, {
            "success": False,
            "error": "Endpoint not found"
        })

    def list_projects(self):
        with connect() as db:
            rows = db.execute("""
                SELECT id, name, description, project_type,
                       folder, created_at, updated_at
                FROM projects
                ORDER BY id DESC
            """).fetchall()

        self.send_json(200, {
            "success": True,
            "projects": [dict(row) for row in rows]
        })

    def get_project(self, project_id):
        with connect() as db:
            row = db.execute("""
                SELECT id, name, description, project_type,
                       folder, created_at, updated_at
                FROM projects
                WHERE id = ?
            """, (project_id,)).fetchone()

        if row is None:
            self.send_json(404, {
                "success": False,
                "error": "Project not found."
            })
            return

        project = dict(row)
        folder = project["folder"]

        if not folder or Path(folder).name != folder:
            self.send_json(500, {
                "success": False,
                "error": "Invalid project folder metadata."
            })
            return

        project_dir = PROJECTS_DIR / folder
        source_dir = project_dir / "src"

        files = {}
        for key, filename in {
            "X": "main.x",
            "X#": "main.xsharp",
            "XS": "main.xs"
        }.items():
            file_path = source_dir / filename
            files[key] = (
                file_path.read_text(encoding="utf-8")
                if file_path.is_file()
                else ""
            )

        project["files"] = files

        self.send_json(200, {
            "success": True,
            "project": project
        })


    def save_project_file(self, project_id):
        try:
            data = self.read_json()
            language = data.get("language")
            content = data.get("content")

            file_map = {
                "X": "main.x",
                "X#": "main.xsharp",
                "XS": "main.xs"
            }

            if language not in file_map:
                raise ValueError("Unsupported project language.")

            if not isinstance(content, str):
                raise ValueError("File content must be text.")

            if len(content.encode("utf-8")) > 1024 * 1024:
                raise ValueError("Source file exceeds the 1 MB limit.")

            with connect() as db:
                row = db.execute(
                    "SELECT folder FROM projects WHERE id = ?",
                    (project_id,)
                ).fetchone()

            if row is None:
                self.send_json(404, {
                    "success": False,
                    "error": "Project not found."
                })
                return

            folder = row["folder"]
            if not folder or Path(folder).name != folder:
                raise ValueError("Invalid project folder metadata.")

            project_dir = (PROJECTS_DIR / folder).resolve()
            root_dir = PROJECTS_DIR.resolve()

            if project_dir.parent != root_dir or not project_dir.is_dir():
                raise ValueError("Project directory is unavailable.")

            source_dir = project_dir / "src"
            source_dir.mkdir(parents=True, exist_ok=True)

            target = source_dir / file_map[language]
            temporary = target.with_name(target.name + ".tmp")

            temporary.write_text(content, encoding="utf-8")
            temporary.replace(target)

            with connect() as db:
                db.execute(
                    "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (project_id,)
                )
                db.commit()

            self.send_json(200, {
                "success": True,
                "message": f"{language} file saved.",
                "language": language
            })

        except ValueError as error:
            self.send_json(400, {
                "success": False,
                "error": str(error)
            })

        except Exception:
            traceback.print_exc()
            self.send_json(500, {
                "success": False,
                "error": "Unable to save project file. Check server logs."
            })

    def create_project(self):
        try:
            data = self.read_json()

            name = data.get("name", "")
            description = data.get("description", "")
            project_type = data.get("type", "blank")

            if not isinstance(name, str):
                raise ValueError("Project name must be text.")

            if not isinstance(description, str):
                raise ValueError("Description must be text.")

            name = name.strip()
            description = description.strip()

            if not name:
                raise ValueError("Project name is required.")

            if len(name) > 60:
                raise ValueError("Project name must be 60 characters or less.")

            if len(description) > 500:
                raise ValueError("Description must be 500 characters or less.")

            if project_type not in PROJECT_TYPES:
                raise ValueError("Unsupported project type.")

            PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

            with connect() as db:
                cursor = db.execute("""
                    INSERT INTO projects
                        (name, description, project_type)
                    VALUES (?, ?, ?)
                """, (name, description, project_type))

                project_id = cursor.lastrowid
                db.commit()

            folder_name = None

            try:
                folder_name = create_project_files(
                    project_id,
                    name,
                    description,
                    project_type
                )

                with connect() as db:
                    db.execute("""
                        UPDATE projects
                        SET folder = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (folder_name, project_id))
                    db.commit()

            except Exception:
                with connect() as db:
                    db.execute(
                        "DELETE FROM projects WHERE id = ?",
                        (project_id,)
                    )
                    db.commit()

                if folder_name:
                    project_dir = PROJECTS_DIR / folder_name
                    if project_dir.exists():
                        import shutil
                        shutil.rmtree(project_dir)

                raise

            self.send_json(201, {
                "success": True,
                "message": "Project created successfully.",
                "project": {
                    "id": project_id,
                    "name": name,
                    "description": description,
                    "type": project_type,
                    "folder": folder_name
                }
            })

        except ValueError as error:
            self.send_json(400, {
                "success": False,
                "error": str(error)
            })

        except Exception:
            traceback.print_exc()
            self.send_json(500, {
                "success": False,
                "error": "Project creation failed. Check server logs."
            })

    def log_message(self, format, *args):
        print("[CROSS]", format % args)


from workspace_api import install as install_workspace_api
install_workspace_api(CrossHandler)

def main():
    initialize()
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    server = ThreadingHTTPServer((HOST, PORT), CrossHandler)

    print("================================")
    print("       CROSS STUDIO 3.0")
    print("================================")
    print(f"Server:   http://{HOST}:{PORT}")
    print("Health:   /api/health")
    print("Projects: /api/projects")
    print("Press CTRL+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping CROSS 3.0...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
