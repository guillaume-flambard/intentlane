#!/bin/bash
# IntentLane IINA pilot — the full application-owned test command, used as the
# app-test seam of "intentlane verify".
#
# Three suites run, and all must pass:
#   1. core: pure rules (mapping, resolution, the access decision, the open
#      decision against a recording double, the identifier envelope and the
#      subtitle) with no IINA runtime needed;
#   2. index: the adapter's own index wrapper against a real named Core Spotlight
#      index, using a test-specific index name;
#   3. integration: the generated handlers and the adapter's own history source,
#      wired together, with a recording double for the player and the window.
#
# The integration suite is listed here because it exists and passes. A full
# application-owned command that silently skips a suite is a command that reports
# green while a regression in that suite goes unnoticed.
#
# It still does not observe the Siri or Spotlight surfaces. Registration is proven
# by a runtime probe against the built app, not here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== core: pure rules, the access decision, the identifier and subtitle"
bash "$HERE/run-core-tests.sh"

echo
echo "== index: real named Core Spotlight index"
bash "$HERE/run-index-tests.sh"

echo
echo "== integration: generated handlers over the adapter's own history source"
bash "$HERE/run-integration-tests.sh"
