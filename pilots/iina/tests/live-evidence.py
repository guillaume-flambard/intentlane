#!/usr/bin/env python3
"""Observe a system search opening the exact item, in the built application.

What the suites cannot do: they exercise the adapter against a recording double. This
probe drives the real search UI against the real built application and then reads the
application's own log to see which file it opened as a result.

The proof of exactness is a file path that appears in the log *after* the search was
submitted. A row the search UI offered is not an item, a title is not an identifier, and
a file the probe itself handed to the application says nothing about what the search
resolved. All three of those were mistakes in the first version of this probe, and each
one would have produced a green result that proved nothing.

It is a probe, not a claim. It does not prove the Siri conversation, and it does not
prove anything about a title that does not resolve.

## Why it may refuse to run

Driving the search UI needs assistive access, and a process that lacks it is refused by
the system with a named error. That is a grant in System Settings, Privacy & Security,
Accessibility, for whichever process runs this script. When the grant is missing the
probe says so and claims nothing, rather than reporting a failure that is about the
machine and not about the integration.
"""
import argparse
import json
import os
import pathlib
import re
import subprocess
import sys
import time

DISCLAIMERS = (
    "does not prove the Siri conversation: no public API sends a phrase to Siri",
    "does not prove the open path for any other item, only the one it opened",
    "does not prove anything about a title that does not resolve"
)

ACCESSIBILITY_ERROR = "-25211"
NO_SEARCH_UI = "NO_SEARCH_UI_PROCESS"


def speech(text: str) -> str:
    """Only runs of letters, because a pseudo-terminal is never silent.

    Wrapping the process in a pseudo-terminal makes the terminal layer write its own
    control sequences and an end-of-transmission marker into the stream, whether or not
    the application printed anything. Judging "did it speak" on the raw bytes answers
    yes for a process that said nothing.
    """
    return " ".join(re.findall(r"[A-Za-z]{2,}", text))


def has_accessibility() -> tuple[bool, str]:
    """Ask the system whether this process may drive the search UI."""
    probe = 'tell application "System Events" to return name of every process whose frontmost is true'
    result = subprocess.run(["osascript", "-e", probe], capture_output=True, text=True, timeout=20)
    combined = f"{result.stdout}\n{result.stderr}"
    if ACCESSIBILITY_ERROR in combined:
        return False, "this process is not allowed assistive access"
    if result.returncode != 0:
        return False, f"osascript could not answer: {result.stderr.strip() or 'unknown error'}"
    return True, "the process can read the frontmost process"


def session_prefix() -> list[str]:
    if os.environ.get("INTENTLANE_IN_AQUA") == "1":
        return []
    return ["launchctl", "asuser", str(os.getuid())]


def start_application(app: str, fixture: str, log: pathlib.Path):
    """Open a document in the built application and leave it running.

    The log is read from the application's own stdout under a pseudo-terminal, because
    IINA writes through `print` and a GUI process that never exits never flushes a pipe.
    The process is left running because the search has to open into the very same one.
    """
    executable = os.path.join(app, "Contents", "MacOS", os.path.basename(app).removesuffix(".app"))
    sink = open(log, "wb")
    process = subprocess.Popen(
        session_prefix() + ["script", "-q", os.devnull, executable, fixture],
        stdout=sink,
        stderr=sink,
    )
    return process, sink


def stop(process, sink) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
    sink.close()


def ask_search_ui(query: str) -> list[str]:
    """Type a query into the system search and read the rows it offers.

    A failure to reach the search UI is a marker in the list, not an empty list, because
    an empty list and a refusal look the same and one of them means the probe could not
    observe anything. The marker is a word, so it cannot be mistaken for a row.
    """
    script = f'''
    tell application "System Events"
        keystroke " " using command down
        delay 1.2
        keystroke "{query}"
        delay 2.5
        set captured to ""
        try
            tell process "Spotlight"
                set captured to captured & "|" & (name of row 1 of list 1 of scroll area 1 of window 1)
            end tell
        on error
            set captured to "{NO_SEARCH_UI}"
        end try
        return captured
    end tell
    '''
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=40)
    if ACCESSIBILITY_ERROR in f"{result.stdout}{result.stderr}":
        return [NO_SEARCH_UI]
    return [entry.strip() for entry in result.stdout.split("|") if entry.strip()]


def readable_rows(rows: list[str]) -> list[str]:
    """The rows that are actually results, with a refusal marker removed."""
    return [row for row in rows if row != NO_SEARCH_UI]


def submit_first_result() -> bool:
    enter = subprocess.run(
        ["osascript", "-e", 'tell application "System Events" to key code 36'],
        capture_output=True,
        text=True,
        timeout=20,
    )
    return enter.returncode == 0


def opened_after_search(log: pathlib.Path, marker: int, fixture: str) -> bool:
    """Whether the exact fixture was opened after the search was submitted.

    Only the bytes written after `marker` count. The probe itself hands the fixture to
    the application to seed the history, so the file is named in the log before the
    search even runs; counting that would make the check incapable of failing.
    """
    try:
        written = log.read_bytes()[marker:]
    except OSError:
        return False
    return pathlib.Path(fixture).name.encode() in written


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True, help="path to the built application")
    parser.add_argument("--fixture", required=True, help="path to the media fixture to search for")
    parser.add_argument("--title", required=True, help="the title the search UI is asked for")
    parser.add_argument("--log", default="", help="where to keep the application log")
    parser.add_argument("--settle", type=int, default=30)
    parser.add_argument("--json", action="store_true")
    arguments = parser.parse_args()

    app = os.path.abspath(arguments.app)
    fixture = os.path.abspath(arguments.fixture)

    if not os.path.isdir(app):
        print(f"FAIL the built application is not there: {app}")
        return 1
    if not os.path.isfile(fixture):
        print(f"FAIL the fixture is not there: {fixture}")
        return 1

    def refuse(reason: str, unblock: str) -> int:
        print(f"SKIP {reason}")
        print("     this is the machine, not the integration: no claim is made either way")
        print(f"     to continue: {unblock}")
        for statement in DISCLAIMERS:
            print(f"     still, this probe {statement}")
        return 0

    available, reason = has_accessibility()
    if not available:
        return refuse(
            "the search UI cannot be driven from this process",
            "grant Accessibility to this process in System Settings, Privacy & Security, Accessibility"
        )

    log = pathlib.Path(os.path.abspath(arguments.log) or f"/tmp/intentlane-live-{os.getpid()}.log")
    log.parent.mkdir(parents=True, exist_ok=True)
    process, sink = start_application(app, fixture, log)
    try:
        time.sleep(arguments.settle)
        seeded = log.read_text(errors="replace")
        if speech(seeded) == "" or "IntentLane: PlayedMedia registered" not in seeded:
            print("FAIL the application did not register its adapter, so nothing downstream means anything")
            for statement in DISCLAIMERS:
                print(f"     this probe {statement}")
            return 1
        marker = len(log.read_bytes())

        print(f"INFO seeded the history with the fixture: {pathlib.Path(fixture).name}")
        rows = ask_search_ui(arguments.title)
        if not readable_rows(rows):
            return refuse(
                "the search UI offered no readable row, so nothing was observed",
                "run this from a session where the search UI can be read, and confirm the app is registered as the search provider"
            )

        print(f"INFO the search offered: {' | '.join(readable_rows(rows))}")
        if not submit_first_result():
            return refuse(
                "the result could not be opened",
                "confirm the session allows keystrokes to reach the search UI"
            )

        time.sleep(arguments.settle)
        exact = opened_after_search(log, marker, fixture)
    finally:
        stop(process, sink)

    if arguments.json:
        print(json.dumps({
            "probe": "system-search-open",
            "rowsOffered": readable_rows(rows),
            "exactItemOpened": exact,
            "fixture": pathlib.Path(fixture).name
        }, indent=2))

    if exact:
        print(f"PASS the system search opened the exact fixture: {pathlib.Path(fixture).name}")
    else:
        print("FAIL the search returned a row but the exact item did not open afterwards")
        print("     a row is not an item, a title is not an identifier, and a file the")
        print("     probe handed over itself is not something the search resolved")
    for statement in DISCLAIMERS:
        print(f"INFO this probe {statement}")
    return 0 if exact else 1


if __name__ == "__main__":
    sys.exit(main())
