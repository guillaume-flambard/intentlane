# IINA pilot contract

This is the source contract for the IINA local pilot. It is intentionally
limited to IINA's user-controlled playback history.

The app-owned adapter must only expose history while IINA's history recording
preference is on. It must derive opaque identifiers from canonical URLs, never
return filesystem paths in an entity display, and open an exact resolved item
through IINA's existing player route. It must return no result for missing or
ambiguous text rather than opening another item.

Identifier stability, decided on 2026-09-24: IINA's `mpvMd5` is a hash of the
canonical media URL, which for a local file is a hash of its path. It is opaque
and survives a title change, and it does not survive a move or a rename. After
a move the old identifier resolves to nothing and nothing is opened in its
place. The entity subtitle is the media kind only; the last-played date is
excluded, and recency comes from the order of the records.

This contract does not register App Shortcuts. Its target is the macOS 27
system search and open schemas.

## Layout

- `contract.yaml` — this contract, the source of the generated Swift.
- `fixtures/prepare-fixtures.sh` — creates the three local synthetic clips the
  live campaign uses. One is named differently from its embedded title on
  purpose, so the title-versus-path divergence is observed rather than hidden.
- `tests/run-all-tests.sh` — the application-owned test command used as the
  `app-test` seam of `intentlane verify`. It compiles the pilot's pure core with
  its tests, then exercises the index wrapper against a real named Core Spotlight
  index. It needs no IINA build and no test target.
- `evidence-ledger.yaml` — the live evidence ledger, unverified by design until a
  person observes Siri and Spotlight and a second tester reproduces it.
- `RUNBOOK.md` — the observation procedure, what to record, and what the campaign
  cannot establish.
- `out/` — generated output and extracted metadata, not versioned.

The IINA working copy is expected at `~/projects/active/apps/clients/intentlane-iina`
on the branch `intentlane/pilot-playedmedia`. Set `IINA_DIR` to point the tests
elsewhere.

