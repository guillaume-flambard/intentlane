#!/bin/bash
# IntentLane LuLu pilot — the full application-owned test command, used as the
# app-test seam of "intentlane verify".
#
# Two suites run, and both must pass:
#   1. core: the pure rules (eligibility, name matching, identifier lookup, the
#      record's own field set) with no AppIntents and no LuLu;
#   2. index: the index wrapper and the reconcile diff against real named Core
#      Spotlight indexes, using test-specific index names.
#
# There is no deletion suite here, and that is a measured absence rather than an
# oversight. A rule leaving LuLu's store is removed by `LuLu/Extension/Rules.m`,
# inside the privileged system extension, and the application reaches the same
# rules over XPC. No app-side test can make the extension delete a rule, so the
# removal is verified by review and the diff that follows it is what the index
# suite proves. The two earlier certified pilots each had a deletion suite, and
# their record says why.
#
# It still does not observe the Siri or Spotlight surfaces. Registration is proven
# by a runtime probe against the built app, not here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== core: eligibility, name matching, identifier lookup, field set"
bash "$HERE/run-core-tests.sh"

echo
echo "== index: real named Core Spotlight index and the reconcile diff"
bash "$HERE/run-index-tests.sh"
