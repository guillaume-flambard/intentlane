#!/bin/bash
# IntentLane HandBrake pilot — the full application-owned test command, used as the
# app-test seam of "intentlane verify".
#
# Two suites run, and both must pass:
#   1. core: the pure rules (eligibility, name matching, identifier lookup) with no
#      AppIntents and no HandBrake;
#   2. index: the index wrapper against a real named Core Spotlight index, using a
#      test-specific index name.
#
# It still does not observe the Siri or Spotlight surfaces. Registration is proven
# by a runtime probe against the built app, not here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== core: eligibility, name matching, identifier lookup"
bash "$HERE/run-core-tests.sh"

echo
echo "== index: real named Core Spotlight index"
bash "$HERE/run-index-tests.sh"
