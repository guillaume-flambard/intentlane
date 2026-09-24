#!/bin/bash
# IntentLane HandBrake pilot — integration tests.
# Compiles the generated entities with the pilot's real eligibility filter,
# resolver, open path and search routing, then drives them with a fake preset
# source, a recording opener and a recording search surface. The three HandBrake
# seams are replaced; everything under test is production code.
#
# PresetIntegration.swift is deliberately absent from this compile. That is the
# split: the file that speaks Objective-C is not part of what these tests exercise.
set -euo pipefail
HANDBRAKE_DIR="${HANDBRAKE_DIR:-$HOME/projects/active/apps/clients/intentlane-handbrake}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$HANDBRAKE_DIR/macosx/IntentLane"
OUT="$HERE/.build/integrationtests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/PresetCore.swift" \
  "$INTENTLANE/PresetHandlers.swift" \
  "$HERE/integration/main.swift" -o "$OUT"
"$OUT"
