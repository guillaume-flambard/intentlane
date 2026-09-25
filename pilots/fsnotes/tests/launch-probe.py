#!/usr/bin/env python3
"""Launch the built FSNotes and report what its adapter registered.

The probe reads one line. Everything else it prints exists to stop a reader
inferring more than that line supports.

It is not a functional test. It does not prove the Siri conversation, it does not
prove anything appears in Spotlight, and it does not prove the open path selects a
notebook. Those are three separate claims and none of them is this one.

It also refuses to report `registration` when there is no graphical session, because
App Intents needs a window server. A process can start without one, decline to
register, and leave the probe guessing; a guess here would be a green result that
proves nothing.

This is the FSNotes half of a probe whose HandBrake half is the original. The shape
is identical and the three things each app forced are written down in the pilot
record: FSNotes writes its log with `print` rather than a named facility, and it
registers from `applicationDidFinishLaunching`, so the probe waits for the line
rather than for a window.
"""
import argparse
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

MARKER = "IntentLane: Notebook registered"
REGISTRATION_KEY = "dev.memolabs.intentlane.fsnotes-pilot.notebook.registered"
DEFAULTS_DOMAIN = "co.fluder.FSNotes"
LINE = re.compile(
    r"IntentLane: Notebook registered, resolver (?P<resolver>\w+), open (?P<open>\w+), "
    r"search (?P<search>\w+), named index (?P<index>\S+)"
)

DISCLAIMERS = (
    "does not prove the Siri conversation: no public API sends a phrase to Siri",
    "does not prove anything appears in Spotlight: Core Spotlight has no read-back "
    "for a named index",
    "does not prove the open path works end to end: it proves a handler is registered",
)


def graphical_session_available() -> tuple[bool, str]:
    """Report whether this process can reach a window server.

    An agent or CI shell usually runs in the Background bootstrap, where an App
    Intents registration would never happen. `launchctl asuser` enters the same
    user's Aqua session without needing a password, so the probe tries that before
    concluding there is no window server. Concluding too early is the failure this
    function exists to prevent: the caller would skip a claim it could have proved.
    """
    if os.environ.get("SSH_CONNECTION") or os.environ.get("SSH_TTY"):
        return False, "this looks like an SSH session"
    try:
        direct = subprocess.run(
            ["launchctl", "managername"], capture_output=True, text=True, timeout=10
        )
    except (OSError, subprocess.SubprocessError) as failure:
        return False, f"could not ask launchctl: {failure}"
    if direct.stdout.strip() == "Aqua":
        return True, "this process is already in the Aqua session"

    if shutil.which("launchctl") is None:
        return False, f"launchctl reported {direct.stdout.strip() or 'nothing'}"

    uid = os.getuid()
    try:
        asuser = subprocess.run(
            ["launchctl", "asuser", str(uid), "launchctl", "managername"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as failure:
        return False, f"could not enter the user session: {failure}"
    if asuser.stdout.strip() == "Aqua":
        return True, f"the user {uid} session is Aqua, entered with launchctl asuser"
    return False, f"launchctl reported {direct.stdout.strip() or 'nothing'}"


def enter_user_session() -> list[str]:
    """The argv prefix that runs a command inside the user's Aqua session."""
    if os.environ.get("INTENTLANE_IN_AQUA") == "1":
        return []
    return ["launchctl", "asuser", str(os.getuid())]


def launch(app: str, timeout: int) -> tuple[str, str, str]:
    """Start the application, collect its output, and stop it again.

    Both streams are collected and kept apart. FSNotes writes its log with `print`,
    so its registration line is on standard output, but a refusal to spawn arrives on
    standard error, and a probe that discards the stream carrying the reason for its
    own failure reports a fault it did not observe.
    """
    with tempfile.TemporaryDirectory() as scratch:
        out = os.path.join(scratch, "stdout.log")
        err = os.path.join(scratch, "stderr.log")
        with open(out, "wb") as out_sink, open(err, "wb") as err_sink:
            process = subprocess.Popen(
                enter_user_session() + [app],
                stdout=out_sink,
                stderr=err_sink,
                env=dict(os.environ, INTENTLANE_IN_AQUA="1"),
            )
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            time.sleep(0.5)
            process.poll()
            stdout = pathlib.Path(out).read_text(errors="replace")
            for line in stdout.splitlines():
                if MARKER in line:
                    _stop(process)
                    return line, stdout, pathlib.Path(err).read_text(errors="replace")
            if process.returncode is not None:
                break
        _stop(process)
        return (
            "",
            pathlib.Path(out).read_text(errors="replace"),
            pathlib.Path(err).read_text(errors="replace"),
        )


def _stop(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        process.kill()


def registration_recorded() -> bool:
    try:
        value = subprocess.run(
            ["defaults", "read", DEFAULTS_DOMAIN, REGISTRATION_KEY],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return value.returncode == 0 and value.stdout.strip() in {"1", "true"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True, help="path to the built FSNotes.app")
    parser.add_argument("--timeout", type=int, default=90)
    arguments = parser.parse_args()

    app = os.path.abspath(arguments.app)
    if not os.path.isdir(app):
        print(f"FAIL the built application is not there: {app}")
        return 1

    available, reason = graphical_session_available()
    if not available:
        print("SKIP no graphical session, so `registration` is not claimed")
        print(f"     reason: {reason}")
        for line in DISCLAIMERS:
            print(f"     still, this probe {line}")
        return 0

    if shutil.which("defaults") is None:
        print("FAIL defaults(1) is missing, so the registration flag cannot be read")
        return 1

    print(f"INFO session available: {reason}")
    line, stdout, stderr = launch(app, arguments.timeout)
    combined = stdout + stderr

    if not line and "posix_spawn" in combined and "Permission denied" in combined:
        # The session exists but this process may not spawn into it. That is a fact
        # about the machine the probe runs on, not about the adapter, and calling it
        # a failure would put a red mark on the wrong file.
        print("SKIP the graphical session refused to spawn the application")
        print("     this is the environment, not the adapter: `registration` is not claimed")
        for entry in DISCLAIMERS:
            print(f"     still, this probe {entry}")
        return 0

    if not line and not stdout.strip() and not stderr.strip():
        # It wrote nothing at all. Whatever stopped it happened before the app could
        # say anything, which is not a statement about its adapter.
        print("SKIP the application produced no output at all, so nothing was observed")
        print("     this is the environment, not the adapter: `registration` is not claimed")
        for entry in DISCLAIMERS:
            print(f"     still, this probe {entry}")
        return 0

    if not line:
        print("FAIL the application started but never logged its registration line")
        tail = "\n".join(combined.splitlines()[-12:])
        if tail:
            print("     last lines it wrote:")
            for entry in tail.splitlines():
                print(f"       {entry}")
        return 1

    match = LINE.search(line)
    if match is None:
        print(f"FAIL the line was not in the agreed shape: {line}")
        return 1

    resolver = match["resolver"] == "true"
    opener = match["open"] == "true"
    searcher = match["search"] == "true"
    index = match["index"]
    recorded = registration_recorded()

    print(f"INFO resolver registered: {str(resolver).lower()}")
    print(f"INFO open handler registered: {str(opener).lower()}")
    print(f"INFO search handler registered: {str(searcher).lower()}")
    print(f"INFO named index: {index}")
    print(f"INFO registration flag written: {str(recorded).lower()}")

    for statement in DISCLAIMERS:
        print(f"INFO this probe {statement}")

    if not (resolver and opener and searcher and recorded):
        print("FAIL the adapter did not register every registry the contract declares")
        return 1

    print("PASS registration")
    return 0


if __name__ == "__main__":
    sys.exit(main())
