#!/bin/bash
# IntentLane LuLu pilot — index lifecycle tests against a real named Core Spotlight
# index. Compiles the generated entities exactly as the LuLu target compiles them,
# plus the index wrapper, then exercises a test-specific index name.
#
# The second half is the reconcile diff. A rule leaving LuLu's store is
# item_missing, and the removal happens inside the privileged system extension, so
# no app-side test can cause it. This suite drives the disappearance on the source
# instead and checks the diff, which is what makes a removal provable. The
# application's own removal stays verified by review, and the pilot record says so.
set -euo pipefail
LULU_DIR="${LULU_DIR:-$HOME/projects/intentlane-lulu}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$LULU_DIR/IntentLane"
OUT="$HERE/.build/indextests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/RuleCore.swift" \
  "$INTENTLANE/RuleIndex.swift" \
  "$HERE/index/main.swift" -o "$OUT"
"$OUT"
