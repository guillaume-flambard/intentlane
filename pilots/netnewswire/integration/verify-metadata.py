#!/usr/bin/env python3
"""Assert the App Intents surface of a built NetNewsWire pilot app.

Reads the extracted `extract.actionsdata` from an app bundle and checks the
surface the current contract declares. This is machine evidence: it proves the
generated intents and entity reached the metadata processor. It never claims a
Siri or Spotlight observation.

Usage:
  python3 verify-metadata.py /path/to/NetNewsWire.app
  python3 verify-metadata.py /path/to/Metadata.appintents/extract.actionsdata
"""
import json
import plistlib
import subprocess
import sys
from pathlib import Path

EXPECTED_ACTIONS = {
    "MarkArticleRead": {"outputFlags": 4, "schema": None},
    "OpenArticle": {"outputFlags": 0, "schema": "OpenIntent", "openAppWhenRun": True},
    "SearchArticles": {"outputFlags": 4, "schema": "SystemSearchInAppIntent"},
}
EXPECTED_ENTITY = "IntentLaneArticleEntity"
EXPECTED_QUERY = "NetNewsWire.IntentLaneArticleQuery"


def load_actionsdata(arg: str) -> dict:
    path = Path(arg)
    if path.is_dir():
        path = path / "Contents" / "Resources" / "Metadata.appintents" / "extract.actionsdata"
    if not path.is_file():
        raise SystemExit(f"FAIL no extract.actionsdata at {path}")
    try:
        with path.open("rb") as handle:
            return plistlib.load(handle)
    except Exception:
        raw = subprocess.run(["plutil", "-convert", "json", "-o", "-", str(path)], capture_output=True, text=True)
        if raw.returncode != 0:
            raise SystemExit(f"FAIL cannot read {path}: {raw.stderr.strip()}")
        return json.loads(raw.stdout)


def schemas(action: dict) -> list:
    return [s.get("name") for s in action.get("assistantDefinedSchemas", [])]


def main() -> None:
    data = load_actionsdata(sys.argv[1])
    actions = data.get("actions", {})
    entities = data.get("entities", {})
    failures = []

    for name, want in EXPECTED_ACTIONS.items():
        action = actions.get(name)
        if action is None:
            failures.append(f"missing action {name}")
            continue
        if action.get("outputFlags") != want["outputFlags"]:
            failures.append(f"{name}: outputFlags {action.get('outputFlags')} != {want['outputFlags']}")
        if want.get("schema") and want["schema"] not in schemas(action):
            failures.append(f"{name}: schemas {schemas(action)} lack {want['schema']}")
        if "openAppWhenRun" in want and action.get("openAppWhenRun") != want["openAppWhenRun"]:
            failures.append(f"{name}: openAppWhenRun {action.get('openAppWhenRun')} != {want['openAppWhenRun']}")

    extra = sorted(set(actions) - set(EXPECTED_ACTIONS))
    if extra:
        failures.append(f"unexpected actions: {extra}")
    missing = sorted(set(EXPECTED_ACTIONS) - set(actions))
    if missing:
        failures.append(f"missing actions: {missing}")

    entity = entities.get(EXPECTED_ENTITY)
    if entity is None:
        failures.append(f"missing entity {EXPECTED_ENTITY}")
    else:
        if entity.get("defaultQueryIdentifier") != EXPECTED_QUERY:
            failures.append(f"entity query {entity.get('defaultQueryIdentifier')} != {EXPECTED_QUERY}")
        props = [p.get("identifier") for p in entity.get("properties", [])]
        if "title" not in props:
            failures.append(f"entity properties {props} lack 'title'")

    print(f"actions: {sorted(actions)}")
    print(f"entities: {sorted(entities)}")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        raise SystemExit(1)
    print("metadata surface OK: 3 actions, 1 entity, 1 query")


if __name__ == "__main__":
    main()
