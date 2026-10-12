#!/bin/bash
# Runs reproduce.sh from a clean clone of the current branch, to prove it needs nothing that is only on this machine.
# usage: clean-clone-test.sh [iina-source]     (iina-source defaults to the local IINA clone, which is faster than GitHub)
# Everything goes to /tmp/ila/clean-test; the repository and the IINA clone are only read.
set -u
SRC="$(cd "$(dirname "$0")/../../.." && pwd)"
IINA_SOURCE="${1:-$HOME/projects/experiments/intentlane-iina}"
T=/tmp/ila/clean-test
rm -rf "$T"; mkdir -p "$T"
git clone --quiet --local --branch "$(git -C "$SRC" branch --show-current)" "$SRC" "$T/intentlane"
cd "$T/intentlane" || exit 1
echo "clean clone at $(git rev-parse --short HEAD), pilots/iina/out present: $([ -d pilots/iina/out ] && echo yes || echo no)"
pnpm install --frozen-lockfile --offline > "$T/install.log" 2>&1 || pnpm install --frozen-lockfile > "$T/install.log" 2>&1
echo "pnpm install exit: $?"
IINA_DIR="$T/iina-workspace" IINA_UPSTREAM_URL="$IINA_SOURCE" bash pilots/iina/reproduce.sh > "$T/reproduce.log" 2>&1
echo "reproduce.sh exit: $?"
grep -E "^== [1-5]|^note|^pass|^fail|^certified|^blocked|^failing|refusing" "$T/reproduce.log" | cut -c1-200
