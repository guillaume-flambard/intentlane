#!/bin/bash
# Shortcuts donation verification for NetNewsWire pilot
# Checks that the pilot shortcuts are donated and available
# To fix: run app, use the intents (open article, mark read) to trigger donations

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
APP_PATH="$REPO_ROOT/pilots/netnewswire/.build/netnewswire/.intentlane/derived/Build/Products/Debug/NetNewsWire.app"

echo "=== Shortcuts Donation Verification ==="

# Launch app to trigger donations
if ! pgrep -f "NetNewsWire" > /dev/null; then
    echo "Launching app to trigger shortcut donations..."
    open -a "$APP_PATH"
    sleep 5
fi

# The app must be used (open article, mark read) to donate shortcuts
# For now, just check if they exist
echo "Checking for pilot shortcuts..."
SHORTCUTS=$(shortcuts list 2>/dev/null | grep -i "open article\|mark article" || true)

if [[ -n "$SHORTCUTS" ]]; then
    echo "✅ Pilot shortcuts found:"
    echo "$SHORTCUTS" | sed 's/^/   /'
    exit 0
else
    echo "❌ No pilot shortcuts found"
    echo "   FIX: Launch NetNewsWire, use Siri/Shortcuts to 'Open an article in NetNewsWire' and 'Mark an article as read in NetNewsWire' to trigger donations"
    exit 1
fi
