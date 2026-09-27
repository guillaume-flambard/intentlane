#!/bin/bash
# IntentLane LuLu pilot — the pure rules.
# Compiles RuleCore.swift on its own, with no AppIntents and no LuLu, and checks
# eligibility, name matching, identifier lookup and the record's own field set.
#
# The field-set checks are the point of this suite on this application. LuLu's
# canonical identifier is a filesystem path or a signing identity, so a record that
# grew a field to hold either would put a home directory into a client report with
# no line of code saying so. Mirror is the only way that stays a test.
set -euo pipefail
LULU_DIR="${LULU_DIR:-$HOME/projects/intentlane-lulu}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$LULU_DIR/IntentLane/RuleCore.swift"
OUT="$HERE/.build/coretests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$CORE" "$HERE/core/main.swift" -o "$OUT"
"$OUT"
