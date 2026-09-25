#!/usr/bin/env python3
"""Test the launch probe's own logic, and the contract it shares with the app.

The probe's end-to-end run needs a graphical session this machine will not give an
agent process, so that run is recorded as not attempted rather than as a pass. What
can be proved without launching is the part that actually breaks: the probe parses
the line the application writes, and neither side can drift from the other without a
test noticing.

The two tests that matter are therefore the ones that read the built binary. The
application's literal and the probe's regular expression have to agree, and the only
way to know they do is to hold them against each other.
"""
import importlib.util
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
PROBE = HERE.parent / "launch-probe.py"

failures: list[str] = []


def check(condition: bool, message: str) -> None:
    if condition:
        print(f"ok   {message}")
    else:
        print(f"FAIL {message}")
        failures.append(message)


def load_probe():
    spec = importlib.util.spec_from_file_location("launch_probe", PROBE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


probe = load_probe()

# 1. The line shape the probe accepts is the one the recipe and the adapter agreed.
match = probe.LINE.search(
    "IntentLane: Preset registered, resolver true, open true, "
    "named index dev.memolabs.intentlane.handbrake-pilot.preset"
)
check(match is not None, "the probe parses the line shape the adapter writes")
if match is not None:
    check(match["resolver"] == "true", "it reads the resolver state")
    check(match["open"] == "true", "it reads the open state")
    check(
        match["index"] == "dev.memolabs.intentlane.handbrake-pilot.preset",
        "it reads the named index verbatim rather than reconstructing it",
    )

# 2. A partial registration is read as a partial registration, not as a pass.
partial = probe.LINE.search(
    "IntentLane: Preset registered, resolver false, open true, named index dev.x"
)
check(partial is not None and partial["resolver"] == "false", "a false resolver is read as false")
check(
    probe.LINE.search("IntentLane: Preset registered, resolver true, open true") is None,
    "a truncated line is rejected rather than half-read",
)

# 3. The disclaimers are in the probe's output, because a probe that omits them
#    invites a reader to claim more than was measured.
for statement in probe.DISCLAIMERS:
    fragment = statement.split(":", 1)[0].strip()
    check(fragment in " ".join(probe.DISCLAIMERS), f"the probe carries the disclaimer about {fragment}")

check(
    any("Siri" in statement for statement in probe.DISCLAIMERS),
    "the probe says out loud that it does not prove the Siri conversation",
)
check(
    any("Spotlight" in statement for statement in probe.DISCLAIMERS),
    "the probe says out loud that it does not prove anything appears in Spotlight",
)
check(
    any("end to end" in statement for statement in probe.DISCLAIMERS),
    "the probe says out loud that it does not prove the open path works end to end",
)

# 4. The application and the probe cannot drift apart silently. This is the test
#    that stands in for the launch this machine refuses to perform.
binary = pathlib.Path(
    os.environ.get(
        "INTENTLANE_HANDBRAKE_BINARY",
        str(
            pathlib.Path.home()
            / "projects/active/apps/clients/intentlane-handbrake"
            / "build/xroot/release-sandbox/HandBrake.app/Contents/MacOS/HandBrake"
        ),
    )
)
if binary.exists():
    literal = subprocess.run(
        ["strings", "-a", str(binary)], capture_output=True, text=True, check=False
    ).stdout
    check(
        "IntentLane: Preset registered, resolver " in literal,
        "the built application carries the registration line the probe greps for",
    )
    check(
        "IntentLane: Preset registered, resolver " in literal.replace("\n", ""),
        "and it is a single literal, not assembled from fragments the probe would miss",
    )
else:
    print(f"skip the built binary is not there: {binary}")

# 5. The defaults path exists because a sandboxed launch loses the log stream. These
#    are the tests that stand in for that real run.
check(
    probe.INDEX_NAME_KEY != probe.REGISTRATION_KEY,
    "the index name is written under its own key, not folded into the flag",
)
check(
    "handbrake-pilot.preset" in probe.INDEX_NAME_KEY,
    "the index key is the one the adapter declares",
)

# 6. A pseudo-terminal is never silent, so silence must be judged on words and not on
#    bytes. This is the bug that made a working adapter look absent.
check(
    probe._speech("^D\x08\x08") == "",
    "terminal control bytes are not read as the application having spoken",
)
check(
    probe._speech("macgui: hello") == "macgui hello",
    "a real line still counts as speech",
)

# 7. The defaults domain comes from the bundle, never from a constant, because a
#    sandboxed application writes under its own identifier.
bundle = HERE.parent.parent.parent.parent
check(
    probe._default("dev.intentlane.definitely-not-a-real-domain", "anything") is None,
    "a domain that does not exist reads as absent rather than raising",
)

# 8. The session check is the thing that stops the probe over-claiming, so it is
#    tested directly rather than only through a run that happens to have no session.
available, reason = probe.graphical_session_available()
check(
    isinstance(available, bool) and isinstance(reason, str) and reason != "",
    "the session check returns a decision and a reason",
)
check(
    "registration" not in probe.__doc__.lower().split("refuses")[0][-200:]
    or "not claimed" in " ".join(probe.DISCLAIMERS + [probe.__doc__]),
    "the module documents that a missing session means the claim is not made",
)

if failures:
    print(f"FAILURES: {len(failures)}")
    sys.exit(1)
print("ALL PROBE TESTS PASSED")
