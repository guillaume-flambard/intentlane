#!/bin/bash
# IntentLane FSNotes pilot — does the application's own deletion path remove the
# index entry?
#
# This is the proof that nothing is wired. It runs the real funnel,
# `SidebarOutlineView.removeRows(projects:)`, against the real named index, and
# reports what the index still holds afterwards. It is expected to FIND THE
# IDENTIFIER STILL INDEXED. That is the finding, not a failure.
#
# The result is a printed fact, so a person reads it once and the next task turns
# it into a test.
set -euo pipefail
FSNOTES_DIR="${FSNOTES_DIR:-$HOME/projects/active/apps/clients/intentlane-fsnotes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$FSNOTES_DIR/FSNotes/IntentLane"
OUT="$HERE/.build/wiringprobe"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/NotebookCore.swift" \
  "$INTENTLANE/NotebookIndex.swift" \
  "$HERE/wiring/main.swift" -o "$OUT"
"$OUT"
