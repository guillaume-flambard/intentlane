#!/usr/bin/env python3
"""Write the HandBrake deletion fixture.

The HandBrake contract indexes built-in presets only, and `HBPreset` reads
`Type: 1` as "not built in", so a user preset in this file would be ineligible and
the test would prove nothing. An empty `PresetList` makes the manager generate the
real built-ins from libhandbrake, so the suite deletes one of the application's
actual presets rather than one this repository invented.
"""
import json
import pathlib

FIXTURE = pathlib.Path(__file__).resolve().parent / "deletion" / "fixtures" / "presets.json"
FIXTURE.parent.mkdir(parents=True, exist_ok=True)
FIXTURE.write_text(
    json.dumps(
        {"VersionMajor": 2, "VersionMicro": 0, "VersionMinor": 0, "PresetList": []},
        indent=2,
    )
    + "\n"
)
print(f"wrote {FIXTURE}")
