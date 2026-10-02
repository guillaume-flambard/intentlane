#!/bin/sh
# The metadata gate: the built app exposes the declared intents and entity.
# Run reproduce.sh first; the build is external by design.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
work=${NETNEWSWIRE_DIR:-$here/../.build/netnewswire}
app="$work/.intentlane/derived/Build/Products/Debug/NetNewsWire.app"
echo "== metadata"
python3 "$here/../integration/verify-metadata.py" "$app"
echo "ok metadata surface"
