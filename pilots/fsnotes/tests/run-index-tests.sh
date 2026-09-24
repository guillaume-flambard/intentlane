#!/bin/bash
# IntentLane FSNotes pilot — index lifecycle tests against a real named Core
# Spotlight index. Compiles the generated entities exactly as the FSNotes target
# compiles them, plus the adapter's index wrapper, then exercises a test-specific
# index name.
set -euo pipefail
FSNOTES_DIR="${FSNOTES_DIR:-$HOME/projects/active/apps/clients/intentlane-fsnotes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GENERATED="$FSNOTES_DIR/FSNotes/IntentLane/IntentLaneGenerated.swift"
INDEX="$FSNOTES_DIR/FSNotes/IntentLane/NotebookIndex.swift"
OUT="$HERE/.build/indextests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$GENERATED" "$INDEX" "$HERE/index/main.swift" -o "$OUT"
"$OUT"
