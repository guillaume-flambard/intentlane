#!/bin/bash
# IntentLane HandBrake pilot — the application's own preset tree, against a real
# named Core Spotlight index.
#
# The earlier index suite proved the index API in isolation, so it could not see
# that a deleted preset stayed searchable. This suite drives the real
# HBPresetsManager, the real HBTreeNode and the real HBPresetsChangedNotification
# that the tree posts, and checks the index afterwards.
#
# The fixture is the preset JSON the manager itself reads, written into a sandbox
# directory, so the developer's own presets are never loaded or rewritten.
set -euo pipefail
HANDBRAKE_DIR="${HANDBRAKE_DIR:-$HOME/projects/active/apps/clients/intentlane-handbrake}"
HERE="$(cd "$(dirname "$0")" && pwd)"
INTENTLANE="$HANDBRAKE_DIR/macosx/IntentLane"
OUT="$HERE/.build"
mkdir -p "$OUT"

# HandBrake imports its own headers as "HandBrakeKit/HBTreeNode.h", a framework
# layout the source tree does not use. This shim points that prefix at macosx so the
# real sources compile unmodified, rather than editing a single import.
SHIM="$OUT/include"
mkdir -p "$SHIM"
ln -sfn "$HANDBRAKE_DIR/macosx" "$SHIM/HandBrakeKit"

INCLUDES="-I $HANDBRAKE_DIR/macosx -I $HANDBRAKE_DIR/src -I $HANDBRAKE_DIR/libhb -I $HANDBRAKE_DIR/build/libhb -I $HANDBRAKE_DIR/build/src -I $HANDBRAKE_DIR/build/contrib/include -I $HERE/deletion -I $SHIM"

mkdir -p "$OUT/obj"

# libhandbrake pulls in the codec, audio and subtitle libraries the app target links
# too. Naming them one by one is a list that will rot, so link everything the build
# produced, in the same order the app does: libhandbrake first, then its dependencies.
HB_LIBS=""
for archive in "$HANDBRAKE_DIR"/build/contrib/lib/*.a; do
  base=$(basename "$archive" .a)
  HB_LIBS="$HB_LIBS -l${base#lib}"
done
for source in HBTreeNode HBPreset HBMutablePreset HBUtilities NSJSONSerialization+HBAdditions HBPresetsManager; do
  xcrun clang -c -fobjc-arc $INCLUDES "$HANDBRAKE_DIR/macosx/$source.m" -o "$OUT/obj/$source.o"
done
xcrun clang -c -fobjc-arc $INCLUDES "$HERE/deletion/HBPilotPresetsHarness.m" -o "$OUT/obj/HBPilotPresetsHarness.o"

xcrun swiftc -target arm64-apple-macos27.0 \
  -import-objc-header "$HERE/deletion/IntentLane-Deletion-Bridging-Header.h" \
  -Xcc -I"$HANDBRAKE_DIR/macosx" -Xcc -I"$SHIM" \
  -Xcc -I"$HERE/deletion" \
  "$OUT/obj"/*.o \
  "$INTENTLANE/IntentLaneGenerated.swift" \
  "$INTENTLANE/PresetCore.swift" \
  "$INTENTLANE/PresetIndex.swift" \
  "$INTENTLANE/PresetRecords.swift" \
  "$INTENTLANE/PresetObservation.swift" \
  "$HERE/deletion/main.swift" \
  -L /usr/lib -liconv -lc++ -lbz2 -lz -framework AppKit -framework AudioToolbox -framework AVFoundation -framework CoreMedia -framework CoreVideo -framework VideoToolbox -framework CoreGraphics -framework IOKit -L "$HANDBRAKE_DIR/build/libhb" -L "$HANDBRAKE_DIR/build/contrib/lib" -lhandbrake $HB_LIBS \
  -o "$OUT/deletiontests"

SANDBOX="$OUT/sandbox"
rm -rf "$SANDBOX"
mkdir -p "$SANDBOX"
cp "$HERE/deletion/fixtures/presets.json" "$SANDBOX/presets.json"
INTENTLANE_PRESET_FIXTURE="$SANDBOX" "$OUT/deletiontests"
