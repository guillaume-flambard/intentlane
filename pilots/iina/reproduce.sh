#!/bin/bash
# Reproduces the IINA pilot from a clean IntentLane checkout.
#
# It does not carry an IINA fork. It carries the IntentLane-owned integration
# (integration/*.swift and integration/upstream.patch) and applies it to a pinned
# upstream revision, then regenerates the output and runs the certification.
#
#   bash pilots/iina/reproduce.sh
#
# Environment:
#   IINA_DIR           workspace to create or reuse (default ~/projects/_worktrees/iina-pilot/iina).
#                      It is a throwaway checkout. Never point it at a clone you work in.
#                      Its folder must be named `iina`: IINA's own download_libs.sh finds the repository
#                      root by that name and refuses any other.
#   IINA_UPSTREAM_URL  where to clone IINA from (default https://github.com/iina/iina.git).
#   IINA_LIBS_ARGS     arguments for IINA's own other/download_libs.sh (default: --arch arm64 --skip-plugins).
#   BUILD=1            also run IINA's own library download and an xcodebuild, then extract
#                      the App Intents metadata into out/metadata. Heavy: it downloads mpv
#                      libraries and compiles IINA. Without it the `metadata` claim cannot be
#                      certified, and this script says so instead of hiding it.
#
# The pilot output folder (pilots/iina/out) is gitignored on purpose: it is generated.
# Nothing in this script is a claim. The claims are settled by `intentlane verify`.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
INTEGRATION="$HERE/integration"
BASE="$(tr -d '[:space:]' < "$INTEGRATION/UPSTREAM-REVISION")"
IINA_DIR="${IINA_DIR:-$HOME/projects/_worktrees/iina-pilot/iina}"
UPSTREAM_URL="${IINA_UPSTREAM_URL:-https://github.com/iina/iina.git}"
INTENTLANE=(pnpm exec tsx "$REPO/packages/cli/src/index.ts")

say() { printf '\n== %s\n' "$*"; }

say "1. workspace at the pinned upstream revision ${BASE:0:8}"
if [ ! -d "$IINA_DIR/.git" ]; then
  mkdir -p "$(dirname "$IINA_DIR")"
  git clone --quiet --filter=blob:none "$UPSTREAM_URL" "$IINA_DIR"
fi
cd "$IINA_DIR"
if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  git fetch --quiet origin "$BASE" 2>/dev/null || git fetch --quiet origin
fi

say "2. apply the integration (idempotent)"
if git apply --check --reverse "$INTEGRATION/upstream.patch" 2>/dev/null; then
  echo "patch already applied"
else
  if [ -n "$(git status --porcelain)" ]; then
    echo "refusing: $IINA_DIR has changes that are not this integration. Use a fresh IINA_DIR." >&2
    exit 1
  fi
  git checkout --quiet --detach "$BASE"
  git apply "$INTEGRATION/upstream.patch"
  echo "patch applied on ${BASE:0:8}"
fi
mkdir -p "$IINA_DIR/iina/IntentLane"
for file in PlayedMediaCore PlayedMediaHandlers PlayedMediaIndex PlayedMediaIntegration; do
  cp "$INTEGRATION/$file.swift" "$IINA_DIR/iina/IntentLane/$file.swift"
done

say "3. generate from the contract into pilots/iina/out and into the workspace"
cd "$REPO"
"${INTENTLANE[@]}" generate --config "$HERE/contract.yaml" --output "$HERE/out" | tail -1
cp "$HERE/out/IntentLaneGenerated.swift" "$IINA_DIR/iina/IntentLane/IntentLaneGenerated.swift"

if [ "${BUILD:-0}" = "1" ]; then
  say "4. build IINA and extract the App Intents metadata (BUILD=1)"
  cd "$IINA_DIR"
  # arm64 only and no official plugins: this machine is Apple silicon and the claims do not need them.
  [ -d deps/lib ] || bash other/download_libs.sh ${IINA_LIBS_ARGS:---arch arm64 --skip-plugins}
  xcodebuild build -project iina.xcodeproj -scheme iina -configuration Debug \
    -destination 'platform=macOS' -derivedDataPath "$IINA_DIR/.derived" CODE_SIGNING_ALLOWED=NO
  APP="$(find "$IINA_DIR/.derived/Build/Products/Debug" -maxdepth 1 -name 'IINA*.app' | head -1)"
  METADATA="$(find "$APP" -type d -name 'Metadata.appintents' | head -1)"
  [ -n "$METADATA" ] || { echo "build finished but no Metadata.appintents was found in $APP" >&2; exit 1; }
  mkdir -p "$HERE/out/metadata"
  rm -rf "$HERE/out/metadata/Metadata.appintents"
  cp -R "$METADATA" "$HERE/out/metadata/Metadata.appintents"
else
  say "4. build skipped (BUILD=1 builds IINA and extracts the metadata)"
  [ -d "$HERE/out/metadata/Metadata.appintents" ] || \
    echo "note: out/metadata is absent, so the 'metadata' claim will fail until a build has run."
fi

say "5. certify"
cd "$REPO"
IINA_DIR="$IINA_DIR" "${INTENTLANE[@]}" verify --pilot "$HERE/pilot.yaml"
