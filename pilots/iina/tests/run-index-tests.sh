#!/bin/bash
# IntentLane IINA pilot — index lifecycle tests against a real named Core Spotlight
# index. Compiles the generated entities exactly as the IINA target compiles them,
# plus the adapter's index wrapper, then exercises a test-specific index name.
set -euo pipefail
IINA_DIR="${IINA_DIR:-$HOME/projects/active/apps/clients/intentlane-iina}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GENERATED="$IINA_DIR/iina/IntentLane/IntentLaneGenerated.swift"
INDEX="$IINA_DIR/iina/IntentLane/PlayedMediaIndex.swift"
OUT="$HERE/.build/indextests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$GENERATED" "$INDEX" "$HERE/index/main.swift" -o "$OUT"
"$OUT"
