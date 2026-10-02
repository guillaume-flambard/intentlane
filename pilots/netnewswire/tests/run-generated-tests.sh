#!/bin/sh
# The generated gate: the generated Swift in the workspace still matches the
# contract. Run reproduce.sh first; the workspace is external by design.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(git -C "$here" rev-parse --show-toplevel)
work=${NETNEWSWIRE_DIR:-$here/../.build/netnewswire}
gen="$work/Mac/IntentLanePilot"
echo "== generated"
if [ ! -f "$gen/IntentLaneGenerated.swift" ]; then
	echo "FAIL no generated output at $gen. Run reproduce.sh first." >&2
	exit 1
fi
( cd "$root" && pnpm exec tsx packages/cli/src/index.ts generate -c "$here/../contract.yaml" -o "$gen" --check )
echo "ok generated matches the contract"
