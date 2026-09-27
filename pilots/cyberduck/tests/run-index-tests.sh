#!/bin/bash
# IntentLane Cyberduck pilot — index lifecycle tests against a real named Core Spotlight
# index. Compiles the generated entity exactly as the Cyberduck target compiles it,
# plus the index wrapper, then exercises a test-specific index name.
#
# The second half is the folder diff. There is no notification on this application:
# the bookmarks folder is a directory the application writes into whenever the person
# saves or removes a connection, and nothing announces it. So the test removes a real
# .duck file and watches the tracked set, which is the only record of what was
# indexed because Core Spotlight has no read-back for a named index.
set -euo pipefail
CYBERDUCK_DIR="${CYBERDUCK_DIR:-$HOME/projects/_external/intentlane-candidates/cyberduck}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$CYBERDUCK_DIR/IntentLane"
OUT="$HERE/.build/indextests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/ConnectionCore.swift" \
  "$INTENTLANE/ConnectionIndex.swift" \
  "$HERE/index/main.swift" -o "$OUT"
"$OUT"
