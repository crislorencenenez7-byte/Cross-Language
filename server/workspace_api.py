import re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote

def install(handler):
    old_get = handler.do_GET
    old_post = handler.do_POST

    def project_dir(pid):
        from pathlib import Path
        from database import PROJECTS_DIR, connect
        with connect() as db:
            row = db.execute(
                "SELECT folder FROM projects WHERE id=?", (pid,)
            ).fetchone()
        if not row or not row["folder"] or Path(row["folder"]).name != row["folder"]:
            raise ValueError("Project not found.")
        root = (PROJECTS_DIR / row["folder"]).resolve()
        if root.parent != PROJECTS_DIR.resolve() or not root.is_dir():
            raise ValueError("Invalid project directory.")
        return root

    def safe_path(root, value):
        value = str(value or "").replace("\\", "/")
        parts = value.split("/")
        if not value or value.startswith("/") or any(p in ("", ".", "..") for p in parts):
            raise ValueError("Invalid project path.")
        target = (root / value).resolve()
        if root not in target.parents:
            raise ValueError("Path outside project.")
        return target

    def get(self):
        path = urlsplit(self.path)
        match = re.fullmatch(r"/api/projects/(\d+)/tree", path.path)
        if not match:
            match = re.fullmatch(r"/api/projects/(\d+)/file", path.path)
            if not match:
                return old_get(self)
            try:
                root = project_dir(int(match.group(1)))
                rel = parse_qs(path.query).get("path", [""])[0]
                target = safe_path(root, rel)
                if not target.is_file():
                    return self.send_json(404, {"success":False,"error":"File not found."})
                return self.send_json(200, {
                    "success":True, "path":rel,
                    "content":target.read_text(encoding="utf-8")
                })
            except Exception as e:
                return self.send_json(400, {"success":False,"error":str(e)})
        try:
            root = project_dir(int(match.group(1)))
            items = []
            for p in sorted(root.rglob("*")):
                if p.is_file() and not any(x.startswith(".") for x in p.relative_to(root).parts):
                    items.append({"path":p.relative_to(root).as_posix(),"type":"file"})
                elif p.is_dir():
                    items.append({"path":p.relative_to(root).as_posix(),"type":"folder"})
            return self.send_json(200, {"success":True,"items":items})
        except Exception as e:
            return self.send_json(400, {"success":False,"error":str(e)})

    def post(self):
        path = urlsplit(self.path).path
        match = re.fullmatch(r"/api/projects/(\d+)/items", path)
        file_match = re.fullmatch(r"/api/projects/(\d+)/file", path)
        if not match and not file_match:
            return old_post(self)
        try:
            pid = int((match or file_match).group(1))
            data = self.read_json()
            root = project_dir(pid)
            rel = data.get("path", "")
            target = safe_path(root, rel)
            if file_match:
                content = data.get("content")
                if not isinstance(content, str) or len(content.encode("utf-8")) > 1024*1024:
                    raise ValueError("Invalid file content or file exceeds 1 MB.")
                if not target.is_file():
                    raise ValueError("File does not exist.")
                temp = target.with_name(target.name + ".tmp")
                temp.write_text(content, encoding="utf-8")
                temp.replace(target)
                return self.send_json(200, {"success":True,"message":"File saved."})
            kind = data.get("type")
            if kind == "folder":
                target.mkdir(parents=True, exist_ok=False)
            elif kind == "file":
                if target.suffix.lower() not in (".x", ".xsharp", ".xs", ".txt", ".json", ".md"):
                    raise ValueError("Unsupported file extension.")
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("x", encoding="utf-8") as f:
                    f.write("")
            else:
                raise ValueError("Type must be folder or file.")
            return self.send_json(201, {"success":True,"message":kind.capitalize()+" created."})
        except FileExistsError:
            return self.send_json(409, {"success":False,"error":"Item already exists."})
        except Exception as e:
            return self.send_json(400, {"success":False,"error":str(e)})

    handler.do_GET = get
    handler.do_POST = post
