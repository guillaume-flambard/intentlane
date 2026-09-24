#!/bin/bash
# IntentLane HandBrake pilot — the pure rules.
# Compiles PresetCore.swift on its own, with no AppIntents and no HandBrake, and
# checks eligibility, name matching and identifier lookup directly.
set -euo pipefail
HANDBRAKE_DIR="${HANDBRAKE_DIR:-$HOME/projects/active/apps/clients/intentlane-handbrake}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$HANDBRAKE_DIR/macosx/IntentLane/PresetCore.swift"
OUT="$HERE/.build/coretests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$CORE" "$HERE/core/main.swift" -o "$OUT"
"$OUT"
