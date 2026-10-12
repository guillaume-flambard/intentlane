#!/bin/bash
# Builds the pinned, unmodified Nextcloud iOS the way Nextcloud's own CI does
# (.github/workflows/xcode.yml): `xcodebuild build-for-testing`, a concrete simulator,
# `-derivedDataPath` (plus the package location, which a shared checkout needs), and the mock GoogleService-Info.plist their CI downloads.
# usage: [EXTRA_BUILD_SETTINGS="NAME=value ..."] build-pristine.sh <log-name>
# DERIVED names the derived data folder under the workspace (default DerivedData), so a clean build is a new folder.
# EXTRA_OTHER_SWIFT_FLAGS is appended to OTHER_SWIFT_FLAGS as one argument, so it may contain spaces.
# EXTRA_BUILD_SETTINGS are command line build settings only, never an edit of the fork.
# Workspace, derived data and logs stay outside the fork and outside IntentLane.
set -u
W="$HOME/projects/_worktrees/nextcloud-ios"
cd "$W/pilot" || exit 1
log="$W/logs/${1:-build}.log"
if [ ! -s GoogleService-Info.plist ]; then
  curl -s -m 30 -o GoogleService-Info.plist https://raw.githubusercontent.com/firebase/quickstart-ios/master/mock-GoogleService-Info.plist
fi
echo "plist: $(wc -c < GoogleService-Info.plist) bytes" > "$log"
ID="$(cat "$W/logs/sim-id.txt")"
exec xcodebuild build-for-testing -project Nextcloud.xcodeproj -scheme Nextcloud \
  -destination "platform=iOS Simulator,id=$ID" -derivedDataPath "$W/${DERIVED:-DerivedData}" \
  -clonedSourcePackagesDirPath "$W/SourcePackages" $EXTRA_BUILD_SETTINGS \
  "OTHER_SWIFT_FLAGS=\$(inherited) ${EXTRA_OTHER_SWIFT_FLAGS:-}" >> "$log" 2>&1
