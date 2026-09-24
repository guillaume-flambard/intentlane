#!/bin/bash
# IntentLane IINA pilot — the full application-owned test command, used as the
# app-test seam of "intentlane verify".
#
# Two suites run, and both must pass:
#   1. core: pure rules (mapping, resolution, openability, the open decision
#      against a recording double, the identifier envelope and the subtitle) with
#      no IINA runtime needed;
#   2. index: the adapter's own index wrapper against a real named Core Spotlight
#      index, using a test-specific index name.
#
# It still does not observe the Siri or Spotlight surfaces. Registration is proven
# by a runtime probe against the built app, not here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== core: pure rules, the open decision, the identifier and subtitle"
bash "$HERE/run-core-tests.sh"

echo
echo "== index: real named Core Spotlight index"
bash "$HERE/run-index-tests.sh"
