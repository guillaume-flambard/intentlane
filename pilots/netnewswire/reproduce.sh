#!/bin/sh
# Reproduce the NetNewsWire pilot machine surface from a clean checkout.
#
# One entry point, no undocumented steps. It fetches the pinned NetNewsWire
# revision, generates the App Intents from the canonical contract, copies the
# IntentLane-owned adapter, wires the lifecycle hooks, builds the app and checks
# the extracted metadata.
#
# It never claims a Siri or Spotlight observation: those remain human gates.
#
# Usage:
#   sh pilots/netnewswire/reproduce.sh
#
# Environment:
#   NETNEWSWIRE_DIR  use an existing NetNewsWire checkout instead of a fresh one
#   SKIP_BUILD=1     stop after generating and applying the integration
set -eu

PILOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(git -C "$PILOT_DIR" rev-parse --show-toplevel)
REVISION=0184ca38c586078117a21f96f68eef78d39b8f68
UPSTREAM=https://github.com/Ranchero-Software/NetNewsWire.git
WORK=${NETNEWSWIRE_DIR:-$PILOT_DIR/.build/netnewswire}
DERIVED="$WORK/.intentlane/derived"
APP="$DERIVED/Build/Products/Debug/NetNewsWire.app"

echo "== workspace"
if [ -d "$WORK/.git" ]; then
	echo "reusing $WORK"
else
	mkdir -p "$(dirname -- "$WORK")"
	git init -q "$WORK"
	git -C "$WORK" remote add origin "$UPSTREAM" 2>/dev/null || true
fi
git -C "$WORK" fetch --depth 1 origin "$REVISION"
git -C "$WORK" checkout -q FETCH_HEAD
echo "revision $(git -C "$WORK" rev-parse HEAD)"

echo "== secrets"
bash "$WORK/buildscripts/updateSecrets.sh"

echo "== generate"
( cd "$REPO_ROOT" && pnpm exec tsx packages/cli/src/index.ts generate -c "$PILOT_DIR/contract.yaml" -o "$WORK/Mac/IntentLanePilot" )
cp "$PILOT_DIR/integration/IntentLanePilot.swift" "$WORK/Mac/IntentLanePilot/IntentLanePilot.swift"

echo "== integration hooks"
python3 "$PILOT_DIR/integration/apply-hooks.py" "$WORK"

if [ "${SKIP_BUILD:-0}" = "1" ]; then
	echo "SKIP_BUILD=1: stopping before the build"
	exit 0
fi

echo "== build"
xcodebuild -project "$WORK/NetNewsWire.xcodeproj" -scheme NetNewsWire \
	-configuration Debug -destination 'platform=macOS' \
	-derivedDataPath "$DERIVED" \
	CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build

echo "== metadata"
python3 "$PILOT_DIR/integration/verify-metadata.py" "$APP"

echo "== done"
echo "pilot app: $APP"
echo "serve the fixture: sh $REPO_ROOT/docs/pilots/fixtures/serve.sh"
