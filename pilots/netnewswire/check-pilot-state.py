#!/usr/bin/env python3
"""Check the machine-verifiable pre-human state of the NetNewsWire pilot.

Reads the running app through its own AppleScript dictionary and asserts the
state the acceptance protocol needs. This is setup state, never evidence: it
proves the fixture is loaded and Beta is unread so the mark-read transition is
observable. It does not observe Siri or Spotlight.

Usage:
  python3 check-pilot-state.py [--app "NetNewsWire IntentLane Pilot"]
"""
import subprocess
import sys

ACCOUNT = "On My Mac"
FEED_NAME = "IntentLane NetNewsWire Pilot"
EXPECTED = {"intentlane-alpha", "intentlane-beta", "intentlane-gamma"}

SCRIPT = f'''
tell application "{{app}}"
  set out to ""
  repeat with a in (allFeeds of account "{ACCOUNT}")
    if (name of a) is "{FEED_NAME}" then
      repeat with art in (articles of a)
        set out to out & (id of art) & tab & (title of art) & tab & (read of art) & linefeed
      end repeat
    end if
  end repeat
  return out
end tell
'''


def main() -> None:
    app = "NetNewsWire IntentLane Pilot"
    if "--app" in sys.argv:
        app = sys.argv[sys.argv.index("--app") + 1]

    result = subprocess.run(
        ["osascript", "-e", SCRIPT.format(app=app)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"FAIL cannot read the pilot state from {app!r}: {result.stderr.strip()}")

    rows = [line.split("\t") for line in result.stdout.strip().splitlines() if line.strip()]
    articles = {row[0]: {"title": row[1], "read": row[2] == "true"} for row in rows}

    failures = []
    if set(articles) != EXPECTED:
        failures.append(f"articles {sorted(articles)} != {sorted(EXPECTED)}")
    beta = articles.get("intentlane-beta")
    if beta is None:
        failures.append("Beta article is absent")
    elif beta["read"]:
        failures.append("Beta is already read: the mark-read transition would not be observable")

    for guid, entry in sorted(articles.items()):
        print(f"  {guid}: read={entry['read']} title={entry['title']!r}")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        raise SystemExit(1)
    print("pilot state OK: 3 canonical articles present, Beta unread")


if __name__ == "__main__":
    main()
