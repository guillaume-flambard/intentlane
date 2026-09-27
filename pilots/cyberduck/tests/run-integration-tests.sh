#!/bin/bash
# IntentLane Cyberduck pilot — integration tests.
# Compiles the generated entity with the pilot's real eligibility filter, resolver
# and open path, then drives them with a fake source and a recording opener. The
# two Cyberduck seams are replaced; everything under test is production code.
#
# The opener is handed a file, never a hostname, and four of the checks exist to
# hold that line. The application offers a second route, an sftp:// URL that
# MainController parses into a Host, and that route would put a client's customers'
# hostnames in a Siri utterance. This suite is how a reader sees which route the
# mapping chose.
#
# ConnectionIntegration.swift is deliberately absent from this compile. That is the
# split: the file that resolves where the folder is, and that hands a url to
# LaunchServices, is not part of what these tests exercise.
set -euo pipefail
CYBERDUCK_DIR="${CYBERDUCK_DIR:-$HOME/projects/_external/intentlane-candidates/cyberduck}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$CYBERDUCK_DIR/IntentLane"
OUT="$HERE/.build/integrationtests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/ConnectionCore.swift" \
  "$INTENTLANE/ConnectionHandlers.swift" \
  "$HERE/integration/main.swift" -o "$OUT"
"$OUT"
