#!/bin/bash
# IntentLane IINA pilot — pure core tests.
# Compiles the pilot's core with its tests and runs them. No IINA build needed.
# The IINA working copy is located by IINA_DIR, defaulting to the durable clone.
set -euo pipefail
IINA_DIR="${IINA_DIR:-$HOME/projects/active/apps/clients/intentlane-iina}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$IINA_DIR/iina/IntentLane/PlayedMediaCore.swift"
OUT="$HERE/.build/coretests"
mkdir -p "$HERE/.build"
xcrun swiftc -target arm64-apple-macos27.0 "$CORE" "$HERE/core/main.swift" -o "$OUT"
"$OUT"
