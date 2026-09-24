#!/bin/bash
# IntentLane HandBrake pilot — index lifecycle tests against a real named Core
# Spotlight index. Compiles the generated entities exactly as the HandBrake target
# compiles them, plus the index wrapper, then exercises a test-specific index name.
set -euo pipefail
HANDBRAKE_DIR="${HANDBRAKE_DIR:-$HOME/projects/active/apps/clients/intentlane-handbrake}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GENERATED="$HANDBRAKE_DIR/macosx/IntentLane/IntentLaneGenerated.swift"
INDEX="$HANDBRAKE_DIR/macosx/IntentLane/PresetIndex.swift"
OUT="$HERE/.build/indextests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$GENERATED" "$INDEX" "$HERE/index/main.swift" -o "$OUT"
"$OUT"
