#!/bin/bash
# IntentLane HandBrake pilot — does the presets notification remove the index entry?
#
# This is the proof that nothing is wired. It exercises the index surface and
# reports what the application's own preset-change notification does about it. It
# is expected to FIND THE IDENTIFIER STILL INDEXED. That is the finding, not a
# failure.
set -euo pipefail
HANDBRAKE_DIR="${HANDBRAKE_DIR:-$HOME/projects/active/apps/clients/intentlane-handbrake}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$HANDBRAKE_DIR/macosx/IntentLane"
OUT="$HERE/.build/wiringprobe"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/PresetCore.swift" \
  "$INTENTLANE/PresetIndex.swift" \
  "$HERE/wiring/main.swift" -o "$OUT"
"$OUT"
