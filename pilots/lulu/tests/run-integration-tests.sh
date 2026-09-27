#!/bin/bash
# IntentLane LuLu pilot — integration tests.
# Compiles the generated entities with the pilot's real eligibility filter,
# resolver, open path and search routing, then drives them with a fake rule source,
# a recording opener and a recording search surface. The three LuLu seams are
# replaced; everything under test is production code.
#
# RuleIntegration.swift is deliberately absent from this compile. That is the
# split: the file that speaks Objective-C is not part of what these tests exercise,
# and on this application it could not be, because it needs the privileged helper.
set -euo pipefail
LULU_DIR="${LULU_DIR:-$HOME/projects/intentlane-lulu}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$LULU_DIR/IntentLane"
OUT="$HERE/.build/integrationtests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/RuleCore.swift" \
  "$INTENTLANE/RuleHandlers.swift" \
  "$HERE/integration/main.swift" -o "$OUT"
"$OUT"
