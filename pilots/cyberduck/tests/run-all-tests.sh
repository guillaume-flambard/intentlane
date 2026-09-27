#!/bin/bash
# IntentLane Cyberduck pilot — the full application-owned test command, used as the
# app-test seam of "intentlane verify".
#
# Two suites run, and both must pass:
#   1. core: the pure rules (eligibility, name matching, identifier lookup, the store
#      projection and the record's own field set) with no AppIntents and no Cyberduck;
#   2. index: the index wrapper against a real named Core Spotlight index, plus the
#      folder diff, using test-specific index names.
#
# There is no deletion suite and there is no live-app suite, and both absences are
# measured rather than convenient. A deleted connection is a `.duck` file that is
# gone, so the index suite removes a real file and watches the tracked set. Launching
# the application to observe a registration line would need the bundled JVM, a signed
# identity and a graphical session, so `registration` is not claimed and the claim
# stays out of the default set.
#
# It still does not observe the Siri or Spotlight surfaces. Registration is proven by a
# runtime probe against the built app, not here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== core: eligibility, name matching, identifier lookup, the store projection"
bash "$HERE/run-core-tests.sh"

echo
echo "== index: real named Core Spotlight index and the folder diff"
bash "$HERE/run-index-tests.sh"
