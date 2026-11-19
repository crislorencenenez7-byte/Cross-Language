import json
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parent.parent
STUDIO = ROOT / "studio"
STATE = ROOT / "database" / "redesign-deploy.json"
PHT = timezone(timedelta(hours=8))
TARGET = datetime(2026, 11, 19, 19, 0, 0, tzinfo=PHT)

print("CROSS 3.0 scheduler started.", flush=True)
print("Target: 2026-11-19 7:00 PM PHT", flush=True)

while True:
    now = datetime.now(PHT)
    remaining = (TARGET - now).total_seconds()
    if remaining <= 0:
        break
    time.sleep(min(2, remaining))

version = "3.0-redesign-1900"
(STUDIO / "version.json").write_text(
    json.dumps({"version": version}),
    encoding="utf-8"
)
STATE.write_text(
    json.dumps({
        "status": "deployed",
        "version": version,
        "time": datetime.now(PHT).isoformat()
    }, indent=2),
    encoding="utf-8"
)
print("CROSS 3.0 update marker deployed at", datetime.now(PHT).isoformat(), flush=True)
