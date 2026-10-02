#!/bin/sh
# The pilot test command: every machine gate this directory can settle, in order.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
echo "== suites"
sh "$here/run-contract-tests.sh"
sh "$here/run-generated-tests.sh"
sh "$here/run-metadata-tests.sh"
echo "ok all machine gates"
