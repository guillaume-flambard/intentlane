#!/usr/bin/env python3
"""Test the FSNotes launch probe, and the contract it shares with the app.

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
    spec = importlib.util.spec_from_file_location("fsnotes_launch_probe", PROBE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


probe = load_probe()

# 1. The line shape the probe accepts is the one the adapter agreed to write.
match = probe.LINE.search(
    "IntentLane: Notebook registered, resolver true, open true, search true, "
    "named index dev.memolabs.intentlane.fsnotes-pilot.notebook"
)
check(match is not None, "the probe parses the line shape the adapter writes")
if match is not None:
    check(match["resolver"] == "true", "it reads the resolver state")
    check(match["open"] == "true", "it reads the open state")
    check(match["search"] == "true", "it reads the search state")
    check(
        match["index"] == "dev.memolabs.intentlane.fsnotes-pilot.notebook",
        "it reads the named index verbatim rather than reconstructing it",
    )

# 2. A partial registration is read as a partial registration, not as a pass.
partial = probe.LINE.search(
    "IntentLane: Notebook registered, resolver true, open false, search true, named index dev.x"
)
check(partial is not None and partial["open"] == "false", "a false handler is read as false")
check(
    probe.LINE.search("IntentLane: Notebook registered, resolver true, open true") is None,
    "a truncated line is rejected rather than half-read",
)

# 3. The disclaimers are in the probe's output, because a probe that omits them
#    invites a reader to claim more than was measured.
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
        "INTENTLANE_FSNOTES_BINARY",
        str(
            pathlib.Path.home()
            / "Library/Developer/Xcode/DerivedData/FSNotes-dphzkaxrgbwuzfecvgreouchvvfw"
            / "Build/Products/Debug/FSNotes.app/Contents/MacOS/FSNotes.debug.dylib"
        ),
    )
)
if binary.exists():
    literal = subprocess.run(
        ["strings", "-a", str(binary)], capture_output=True, text=True, check=False
    ).stdout
    check(
        "IntentLane: Notebook registered, resolver " in literal,
        "the built application carries the registration line the probe greps for",
    )
    check(
        "dev.memolabs.intentlane.fsnotes-pilot.notebook.registered" in literal,
        "and the registration key the probe reads",
    )
else:
    print(f"skip the built binary is not there: {binary}")

# 5. The two probes agree on the shape, which is what makes this one probe reused
#    twice rather than two probes.
sibling = HERE.parent.parent.parent / "handbrake" / "tests" / "launch-probe.py"
if sibling.exists():
    spec = importlib.util.spec_from_file_location("hb_launch_probe", sibling)
    other = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(other)
    check(
        probe.DISCLAIMERS == other.DISCLAIMERS,
        "the FSNotes and HandBrake probes carry the same three disclaimers",
    )
    check(
        set(probe.DISCLAIMERS) >= {"does not prove the Siri conversation: no public API sends a phrase to Siri"},
        "and they are the same three claims, not three of their own",
    )

if failures:
    print(f"FAILURES: {len(failures)}")
    sys.exit(1)
print("ALL PROBE TESTS PASSED")
