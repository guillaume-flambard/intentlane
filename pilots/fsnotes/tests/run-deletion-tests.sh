#!/bin/bash
# IntentLane FSNotes pilot — the application's own deletion path, against a real
# named Core Spotlight index.
#
# The earlier index suite proves the index API in isolation. It cannot prove that
# a notebook leaving FSNotes takes its entry with it, because it never loads
# FSNotes. This suite does, and it compiles the exact file list Xcode compiles,
# read from the project file rather than guessed with `find`, so the code under
# test is the app's own.
#
# AppDelegate keeps its own behaviour but loses its `@NSApplicationMain`
# attribute, because the attribute owns `main` and the harness supplies one. The
# delegate is not on the path that removes a notebook, so nothing it does is
# needed; the type is, because AppDelegate+URLRoutes refers to it.
set -euo pipefail
FSNOTES_DIR="${FSNOTES_DIR:-$HOME/projects/active/apps/clients/intentlane-fsnotes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/.build"
BUILD_DIR=$(xcodebuild -project "$FSNOTES_DIR/FSNotes.xcodeproj" -scheme FSNotes -configuration Debug -destination "platform=macOS" -showBuildSettings 2>/dev/null | python3 -c 'import re,sys; print(re.search(r"^\s*BUILD_DIR = (.+)$", sys.stdin.read(), re.M).group(1))')
OBJECTS="$(dirname "$BUILD_DIR")"
DERIVED="$BUILD_DIR/Debug"
MAPS="$OBJECTS/Intermediates.noindex/GeneratedModuleMaps"

mkdir -p "$OUT"

if [ ! -d "$MAPS" ]; then
  echo "the generated module maps are missing: $MAPS" >&2
  echo "build the app first: xcodebuild -project FSNotes.xcodeproj -scheme FSNotes -build" >&2
  exit 1
fi

module_flags=""
for map in "$MAPS"/*.modulemap; do
  module_flags="$module_flags -Xcc -fmodule-map-file=$map"
done

# shellcheck disable=SC2046
app_sources=$(python3 "$HERE/model/target-sources.py" "$FSNOTES_DIR/FSNotes.xcodeproj/project.pbxproj" --strip-entry-point AppDelegate.swift --out-dir "$OUT/entry")

xcrun swiftc -target arm64-apple-macos27.0 \
  -I "$DERIVED" \
  -Xcc -I"$DERIVED/include" \
  $module_flags \
  $app_sources \
  "$HERE/deletion/main.swift" \
  -L "$DERIVED" \
  "$DERIVED/RNCryptor.o" "$DERIVED/libcmark_gfm.o" "$DERIVED/ZipArchive.o" \
  "$DERIVED/Git.o" "$DERIVED/Shout.o" "$DERIVED/Cgit2.o" "$DERIVED/Socket.o" \
  "$DERIVED/CSystem.o" "$DERIVED/SystemPackage.o" \
  -liconv "$DERIVED/libgit2.a" "$DERIVED/libssh2.a" \
  -o "$OUT/deletiontests"

SANDBOX_HOME="$OUT/home"
rm -rf "$SANDBOX_HOME"
mkdir -p "$SANDBOX_HOME"
HOME="$SANDBOX_HOME" "$OUT/deletiontests"
