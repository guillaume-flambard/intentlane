#!/bin/sh
# Deterministic pilot state: serve the canonical fixture, subscribe the app to it
# through the app's own OPML import, then check the pre-human state.
#
# This is setup. It never observes Siri or Spotlight.
#
# Usage:
#   sh pilots/netnewswire/init-pilot.sh
#
# Environment:
#   PILOT_APP  app name for AppleScript (default "NetNewsWire IntentLane Pilot")
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(git -C "$here" rev-parse --show-toplevel)
fixtures="$root/docs/pilots/fixtures"
app=${PILOT_APP:-NetNewsWire IntentLane Pilot}

echo "== fixture"
if curl -sf -o /dev/null "http://127.0.0.1:8765/pilot-feed.xml"; then
	echo "fixture server already up"
else
	sh "$fixtures/serve.sh" >/dev/null 2>&1 &
	sleep 1
fi
python3 "$fixtures/check-fixture.py" --url "http://127.0.0.1:8765/pilot-feed.xml"

echo "== subscribe via OPML"
open -a "$app" "$fixtures/pilot.opml"
sleep 5

echo "== state"
python3 "$here/check-pilot-state.py" --app "$app"
