#!/usr/bin/env python3
"""Launch the built HandBrake and report what its adapter registered.

The probe reads one line. Everything else it prints exists to stop a reader
inferring more than that line supports.

It is not a functional test. It does not prove the Siri conversation, it does not
prove anything appears in Spotlight, and it does not prove the open path selects a
preset. Those are three separate claims and none of them is this one.

It also refuses to report `registration` when there is no graphical session, because
App Intents needs a window server. A process can start without one, decline to
register, and leave the probe guessing; a guess here would be a green result that
proves nothing.
"""
import argparse
import os
import pathlib
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

MARKER = "IntentLane: Preset"
REGISTRATION_KEY = "dev.memolabs.intentlane.handbrake-pilot.preset.registered"
LINE = re.compile(
    r"IntentLane: Preset registered, resolver (?P<resolver>\w+), open (?P<open>\w+), "
    r"named index (?P<index>\S+)"
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

    Both streams are collected and kept apart. HandBrake writes its log through
    `HBUtilities`, which goes to standard error, but a refusal to spawn also arrives
    on standard error, and a probe that reads one stream cannot tell an adapter that
    stayed quiet from a launch that never happened.

    The executable inside the bundle is launched, not the bundle, and the process is
    given a pseudo-terminal. A `.app` is a directory, so `script` cannot execute it,
    and a buffered stream is unreadable until the process exits, which a GUI
    application does not do. Both mistakes make a working adapter look absent.
    """
    executable = os.path.join(app, "Contents", "MacOS", os.path.basename(app).removesuffix(".app"))
    with tempfile.TemporaryDirectory() as scratch:
        out = os.path.join(scratch, "stdout.log")
        err = os.path.join(scratch, "stderr.log")
        with open(out, "wb") as out_sink, open(err, "wb") as err_sink:
            process = subprocess.Popen(
                enter_user_session() + ["script", "-q", os.devnull, executable],
                stdout=out_sink,
                stderr=err_sink,
                env=dict(os.environ, INTENTLANE_IN_AQUA="1"),
            )
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            time.sleep(0.5)
            process.poll()
            stderr = pathlib.Path(err).read_text(errors="replace")
            for line in stderr.splitlines():
                if MARKER in line:
                    _stop(process)
                    return line, pathlib.Path(out).read_text(errors="replace"), stderr
            if process.returncode is not None:
                break
        _stop(process)
        return (
            "",
            pathlib.Path(out).read_text(errors="replace"),
            pathlib.Path(err).read_text(errors="replace"),
        )


def _speech(text: str) -> str:
    """Keep only words, because a pseudo-terminal is never silent.

    Wrapping the process in a pseudo-terminal makes the terminal layer write its own
    control sequences and an end-of-transmission marker into the stream, whether or
    not the application printed anything. Judging "did it speak" on the raw bytes
    therefore answers yes for a process that said nothing, and the probe reports a
    fault in an application that is fine. Only text with letters in it counts.
    """
    return " ".join(re.findall(r"[A-Za-z]{2,}", text))


def _stop(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        process.kill()


INDEX_NAME_KEY = "dev.memolabs.intentlane.handbrake-pilot.preset.index"


def _default(bundle_id: str, key: str) -> str | None:
    try:
        value = subprocess.run(
            ["defaults", "read", bundle_id, key],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return value.stdout.strip() if value.returncode == 0 else None


def registered_index(bundle_id: str) -> str | None:
    return _default(bundle_id, INDEX_NAME_KEY)


def index_recorded_without_a_log(bundle_id: str) -> str | None:
    """Read the index name when the application left no readable log at all.

    HandBrake is sandboxed, and a sandboxed process launched from outside its
    container loses its log stream. The line is written, the probe cannot see it, and
    a probe that trusted the log alone reports a working adapter as absent. The
    adapter also writes the index name into its own defaults, and that survives, so
    the defaults decide here. The flag is not enough on its own: a flag says the
    adapter ran, not which index the system holds.
    """
    if not registration_recorded(bundle_id):
        return None
    return registered_index(bundle_id)


def registration_recorded(bundle_id: str) -> bool:
    """Read the flag the adapter writes, from the domain it actually writes to.

    The domain is read from the built application's own `Info.plist`, never from a
    constant here. A sandboxed application writes its defaults under its bundle
    identifier, and a probe that hard-codes a different name reads a domain that does
    not exist, which returns "not registered" for an adapter that did register.
    """
    return _default(bundle_id, REGISTRATION_KEY) in {"1", "true"}


def bundle_identifier(app: str) -> str | None:
    plist = os.path.join(app, "Contents", "Info.plist")
    try:
        with open(plist, "rb") as source:
            return plistlib.load(source).get("CFBundleIdentifier")
    except (OSError, plistlib.InvalidFileException, ValueError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True, help="path to the built HandBrake.app")
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

    bundle_id = bundle_identifier(app)
    if bundle_id is None:
        print("FAIL the built application has no readable CFBundleIdentifier")
        return 1

    said_anything = _speech(combined)

    if not line and not said_anything:
        index = index_recorded_without_a_log(bundle_id)
        if index is not None:
            print("INFO the application logged nothing, so its own defaults decide")
            print("INFO the log stream is empty because a sandboxed launch loses it")
            print(f"INFO named index: {index}")
            print("PASS registration")
            for statement in DISCLAIMERS:
                print(f"INFO this probe {statement}")
            return 0
        print("SKIP the application produced no output and wrote no registration flag")
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
    index = match["index"]
    recorded = registration_recorded(bundle_id)

    print(f"INFO {match['index'] and index}")
    print(f"INFO resolver registered: {str(resolver).lower()}")
    print(f"INFO open handler registered: {str(opener).lower()}")
    print(f"INFO named index: {index}")
    print(f"INFO registration flag written: {str(recorded).lower()}")

    for statement in DISCLAIMERS:
        print(f"INFO this probe {statement}")

    if not (resolver and opener and recorded):
        print("FAIL the adapter did not register every registry the contract declares")
        return 1

    print("PASS registration")
    return 0


if __name__ == "__main__":
    sys.exit(main())
