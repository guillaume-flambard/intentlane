#!/bin/bash
# Regenerates the IINA contract into a temporary folder and compares it with the stored pilots/iina/out.
# Read only on the repository: the regenerated files go to $TMPDIR_GEN.
# usage: diff-generated.sh
set -u
cd "$(dirname "$0")/../../.." || exit 1
GEN="${TMPDIR_GEN:-/tmp/ila/gen-iina}"
rm -rf "$GEN"
pnpm exec tsx packages/cli/src/index.ts generate --config pilots/iina/contract.yaml --output "$GEN" 2>&1 | tail -2 | cut -c1-160
echo "-- generated now:"
(cd "$GEN" && find . -type f | sort)
echo "-- stored in pilots/iina/out:"
(cd pilots/iina/out && find . -type f | sort)
echo "-- expected but absent from the stored output:"
comm -23 <(cd "$GEN" && find . -type f | sort) <(cd pilots/iina/out && find . -type f | sort)
echo "-- present in both, content differs:"
for f in $(cd "$GEN" && find . -type f | sort); do
  if [ -f "pilots/iina/out/$f" ] && ! cmp -s "$GEN/$f" "pilots/iina/out/$f"; then echo "$f"; fi
done
