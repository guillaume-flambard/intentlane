#!/bin/bash
# IntentLane Cyberduck pilot — the pure rules.
# Compiles ConnectionCore.swift on its own, with no AppIntents and no Cyberduck,
# and checks eligibility, name matching, identifier lookup, the store projection
# and the record's own field set.
#
# The projection is tested against a real .duck file carrying all thirteen keys
# Host.serialize can write, and the field set is read back with Mirror. Together
# they are the only way to keep "we read two keys" a fact rather than a promise.
set -euo pipefail
CYBERDUCK_DIR="${CYBERDUCK_DIR:-$HOME/projects/_external/intentlane-candidates/cyberduck}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$CYBERDUCK_DIR/IntentLane/ConnectionCore.swift"
OUT="$HERE/.build/coretests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$CORE" "$HERE/core/main.swift" -o "$OUT"
"$OUT"
