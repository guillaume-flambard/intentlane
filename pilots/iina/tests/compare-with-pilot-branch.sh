#!/bin/bash
# Compares the workspace built by reproduce.sh with the pilot branch tip, file by file.
# usage: compare-with-pilot-branch.sh <workspace> <clone-with-the-pilot-branch>
# Both arguments are read only. Prints one line per file and exits 1 on any difference.
set -u
WS="$1"; CLONE="$2"
TIP="$(tr -d '[:space:]' < "$(dirname "$0")/../integration/PILOT-BRANCH-TIP")"
status=0
for f in iina/IntentLane/IntentLaneGenerated.swift iina/IntentLane/PlayedMediaCore.swift \
         iina/IntentLane/PlayedMediaHandlers.swift iina/IntentLane/PlayedMediaIndex.swift \
         iina/IntentLane/PlayedMediaIntegration.swift iina/AppDelegate.swift \
         iina/HistoryWindowController.swift iina.xcodeproj/project.pbxproj; do
  if git -C "$CLONE" show "$TIP:$f" | cmp -s - "$WS/$f"; then echo "identical  $f"; else echo "DIFFERENT  $f"; status=1; fi
done
exit $status
