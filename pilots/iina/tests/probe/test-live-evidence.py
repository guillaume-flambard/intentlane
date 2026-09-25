#!/usr/bin/env python3
"""Test the live-evidence probe's own logic, and the contract it shares with the app.

The end-to-end run of this probe needs assistive access, which a CI shell will not
have, so that run is recorded as skipped rather than as a pass. What can be proved
without driving the search UI is the part that decides whether the probe is allowed to
say the exact item opened, and that is the part worth holding: it is the part that was
wrong twice in the first version of the probe.
"""
import importlib.util
import os
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
PROBE = HERE.parent / "live-evidence.py"

failures: list[str] = []


def check(condition: bool, message: str) -> None:
    if condition:
        print(f"ok   {message}")
    else:
        print(f"FAIL {message}")
        failures.append(message)


spec = importlib.util.spec_from_file_location("live_evidence", PROBE)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

# 1. A refusal marker is not a result. This is the bug that produced a PASS on a run in
#    which the search UI was never reached.
check(
    probe.readable_rows([probe.NO_SEARCH_UI]) == [],
    "a refusal marker is not a readable row"
)
check(
    probe.readable_rows(["Aurora", probe.NO_SEARCH_UI]) == ["Aurora"],
    "a refusal marker is dropped without taking the real rows with it"
)
check(
    probe.readable_rows([]) == [],
    "no rows at all is not a result either"
)

# 2. Only what the search opened counts. The probe seeds the history by handing the
#    fixture to the application itself, so the file is already named in the log before
#    the search runs; counting that would make the check incapable of failing.
with tempfile.TemporaryDirectory() as scratch:
    log = pathlib.Path(scratch) / "app.log"
    log.write_bytes(b"IntentLane: registered\nOpening file:///fixtures/Aurora.mp4\n")
    marker = len(log.read_bytes())
    check(
        not probe.opened_after_search(log, marker, "/fixtures/Aurora.mp4"),
        "a file the probe handed over before the search does not count as opened by it"
    )
    with open(log, "ab") as sink:
        sink.write(b"Opening file:///fixtures/Aurora.mp4 after search\n")
    check(
        probe.opened_after_search(log, marker, "/fixtures/Aurora.mp4"),
        "the same file named after the search does count"
    )
    check(
        not probe.opened_after_search(log, marker, "/fixtures/Borealis.mp4"),
        "another file named after the search does not count"
    )

# 3. A terminal that is never silent must not be read as the application speaking.
check(probe.speech("^D\x08\x08") == "", "terminal control bytes are not speech")
check(probe.speech("IntentLane: registered") != "", "a real line is speech")

# 4. The missing-permission answer is a decision with a reason, not a failure.
available, reason = probe.has_accessibility()
check(isinstance(available, bool), "the accessibility check returns a decision")
check(isinstance(reason, str) and reason != "", "the accessibility check returns a reason")
check(
    "accessibility" in probe.__doc__.lower(),
    "the module documents why it may refuse to run"
)

# 5. The disclaimers are carried, because a probe that omits them invites a reader to
#    claim more than was measured.
check(
    any("Siri" in statement for statement in probe.DISCLAIMERS),
    "the probe says out loud that it does not prove the Siri conversation"
)
check(
    any("other item" in statement for statement in probe.DISCLAIMERS),
    "the probe says it only proves the one item it opened"
)
check(
    any("does not resolve" in statement for statement in probe.DISCLAIMERS),
    "the probe says it proves nothing about a title that does not resolve"
)

# 6. The session prefix keeps the process in the user's Aqua session, because the
#    search UI needs a window server.
check(
    probe.session_prefix()[:2] == ["launchctl", "asuser"] or probe.session_prefix() == [],
    "the probe enters the user's session rather than the background one"
)
os.environ["INTENTLANE_IN_AQUA"] = "1"
check(probe.session_prefix() == [], "the probe does not re-enter when it is already inside")
del os.environ["INTENTLANE_IN_AQUA"]

if failures:
    print(f"FAILURES: {len(failures)}")
    sys.exit(1)
print("ALL LIVE EVIDENCE TESTS PASSED")
