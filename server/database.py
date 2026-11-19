import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "database" / "cross.db"


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize():
    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(projects)")
        }

        migrations = {
            "project_type": "ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'blank'",
            "folder": "ALTER TABLE projects ADD COLUMN folder TEXT NOT NULL DEFAULT ''"
        }

        for column, statement in migrations.items():
            if column not in columns:
                db.execute(statement)

        db.commit()


if __name__ == "__main__":
    initialize()
    print("CROSS 3.0 database initialized.")
    print(DB_PATH)
