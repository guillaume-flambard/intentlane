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
- `pilot.yaml` — what this integration claims and what settles each claim. The
  claim set is deterministic only, so the pilot certifies with no human involved.
  Run `intentlane claims` to see the catalogue.
- `fixtures/prepare-fixtures.sh` — creates the three local synthetic clips the
  optional observation uses. One is named differently from its embedded title on
  purpose, so the title-versus-path divergence is observed rather than hidden.
- `tests/run-all-tests.sh` — the application-owned test command: 37 checks on the
  pure core, then 7 driving the index wrapper against a real named Core Spotlight
  index.
- `tests/run-integration-tests.sh` — 21 checks that execute the real resolver,
  open path and search routing against the real generated entities, with the
  three IINA seams replaced. This is what makes the integration certifiable
  without launching IINA.
- `evidence-ledger.yaml` — evidence for the optional observed claims, not a
  release gate. It is only read when `siri-conversation` or
  `spotlight-ui-result` is claimed.
- `RUNBOOK.md` — the claim discipline, and the observation procedure for the
  claims a person has to settle.
- `out/` — generated output and extracted metadata, not versioned.

The IINA working copy is expected at `~/projects/experiments/intentlane-iina`
on the branch `intentlane/pilot-playedmedia`. Set `IINA_DIR` to point the tests
elsewhere. Manifest paths and gate commands resolve from the manifest's own
directory, so the pilot verifies the same way from anywhere.

The branch matters as much as the path, and the failure when it is wrong is
silent: the core gate then reports `error opening input file ... PlayedMediaCore.swift`
and the cause is a checkout on `intentlane/from-scratch`, not a missing file. The
pilot sources exist on `intentlane/pilot-playedmedia` and on no other branch.


