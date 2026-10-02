#!/bin/sh
# The contract gate: the pilot contract validates against the IntentLane schema.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(git -C "$here" rev-parse --show-toplevel)
echo "== contract"
( cd "$root" && pnpm exec tsx packages/cli/src/index.ts validate -c "$here/../contract.yaml" )
echo "ok contract validates"
