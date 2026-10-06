#!/bin/bash
# Spotlight index verification for NetNewsWire pilot
# Checks that Article entities are indexed in Spotlight
# To fix: run app, sync "IntentLane NetNewsWire Pilot" feed, wait 30s for indexing

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
APP_PATH="$REPO_ROOT/pilots/netnewswire/.build/netnewswire/.intentlane/derived/Build/Products/Debug/NetNewsWire.app"

echo "=== Spotlight Index Verification ==="

# Launch app if not running
if ! pgrep -f "NetNewsWire" > /dev/null; then
    echo "Launching app..."
    open -a "$APP_PATH"
    sleep 5
fi

# The app's IntentLaneArticleIntegration.index() should be called after feed sync
# For now, wait for background indexing
echo "Waiting for Spotlight indexing (30s)..."
sleep 30

# Query for App Intents entities - check for any of our fixture articles
echo "Querying Spotlight for Article entities..."
for article in "Alpha" "Beta" "Gamma"; do
    RESULTS=$(mdfind "kMDItemContentType == 'com.apple.intents.entity' && kMDItemDisplayName == '${article}'c" 2>/dev/null || true)
    if [[ -n "$RESULTS" ]]; then
        echo "✅ '$article' entity found in Spotlight index"
        echo "$RESULTS"
        exit 0
    fi
done

echo "❌ No Article entities found in Spotlight index"
echo "   FIX: Run NetNewsWire, select 'IntentLane NetNewsWire Pilot' feed, wait for sync, then wait 30s for CoreSpotlight indexing"
exit 1
