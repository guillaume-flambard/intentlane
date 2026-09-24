## Why

The pilot's automatic gates 3 and 4 are not proven. `PILOT-IINA-DISCOVERY.md` requires that the
open adapter be tested to call IINA's established playback path *only* for a valid resolved
record, and that index creation and removal be tested for the preference, deletion and
clear-history events. The current suite exercises only the pure helpers (`isOpenable`,
`staleIdentifiers`); nothing touches `PlayerCore`, `CSSearchableIndex` or the registration.

That gap matters more than a normal coverage hole: the `--app-test` command makes
`intentlane verify` print `applicationTests: pass`, and a reader of that result would reasonably
conclude the adapter was tested. It was not.

## What Changes

- Introduce an injectable playback seam so the open path can be asserted without launching a player.
- Assert the open path calls the playback route only for a resolved, still-existing record, and
  refuses an unknown identifier and a deleted file.
- Test the Spotlight lifecycle against a real named `CSSearchableIndex`, covering add, removal on
  history change, removal on preference off, and removal on deleted file.
- Add a test that registration actually populates the resolver and handler registries.
- Name the verification gate for what it covers, so `applicationTests` cannot be read as more than
  it is.

## Capabilities

### New Capabilities
- `iina-automatic-gates`: the IINA pilot's open path, index lifecycle and registration are proven by executable tests.

### Modified Capabilities
- Aucun.

## Impact

Pilot worktree `~/projects/active/apps/clients/intentlane-iina`, pilot test workspace
`pilots/iina/tests` in the product repository, and the
verification documentation that describes the gate. No upstream change, no contact, no PR.
