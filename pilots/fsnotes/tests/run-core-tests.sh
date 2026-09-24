#!/bin/bash
# IntentLane FSNotes pilot — the pure rules.
# Compiles NotebookCore.swift on its own, with no AppIntents and no FSNotes, and
# checks eligibility, name matching and identifier lookup directly.
set -euo pipefail
FSNOTES_DIR="${FSNOTES_DIR:-$HOME/projects/active/apps/clients/intentlane-fsnotes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$FSNOTES_DIR/FSNotes/IntentLane/NotebookCore.swift"
OUT="$HERE/.build/coretests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$CORE" "$HERE/core/main.swift" -o "$OUT"
"$OUT"
