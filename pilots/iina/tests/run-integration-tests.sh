#!/bin/bash
# IntentLane IINA pilot — integration tests.
# Compiles the generated entities with the pilot's real resolver, open path and
# search routing, then drives them with a fake history source, a recording player
# and a recording search surface. The three IINA seams are replaced; everything
# under test is production code.
set -euo pipefail
IINA_DIR="${IINA_DIR:-$HOME/projects/active/apps/clients/intentlane-iina}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$IINA_DIR/iina/IntentLane"
OUT="$HERE/.build/integrationtests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/PlayedMediaCore.swift" \
  "$INTENTLANE/PlayedMediaHandlers.swift" \
  "$HERE/integration/main.swift" -o "$OUT"
"$OUT"
