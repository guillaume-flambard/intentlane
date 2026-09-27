#!/bin/bash
# IntentLane FSNotes pilot — integration tests.
# Compiles the generated entities with the pilot's real eligibility filter,
# resolver, open path and search routing, then drives them with a fake notebook
# source, a recording opener and a recording search surface. The three FSNotes
# seams are replaced; everything under test is production code.
#
# NotebookIntegration.swift is deliberately absent from this compile. That is the
# split: the file that imports FSNotes is not part of what these tests exercise.
set -euo pipefail
FSNOTES_DIR="${FSNOTES_DIR:-$HOME/projects/experiments/intentlane-fsnotes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$FSNOTES_DIR/FSNotes/IntentLane"
OUT="$HERE/.build/integrationtests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/NotebookCore.swift" \
  "$INTENTLANE/NotebookHandlers.swift" \
  "$HERE/integration/main.swift" -o "$OUT"
"$OUT"
