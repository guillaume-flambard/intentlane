#!/bin/sh
# Serve the deterministic NetNewsWire pilot fixture on 127.0.0.1:8765.
#
# The pilot app subscribes to http://127.0.0.1:8765/pilot-feed.xml.
# Running this server is environment setup, never a Siri, Spotlight or
# Shortcuts observation. See docs/pilots/MANUAL-SIRI-ACCEPTANCE.md.
#
# Usage:
#   sh docs/pilots/fixtures/serve.sh
#
# Stop with Ctrl-C. Verify with:
#   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/pilot-feed.xml
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 -m http.server 8765 --bind 127.0.0.1 --directory "$dir"
