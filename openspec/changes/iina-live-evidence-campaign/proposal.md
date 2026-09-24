## Why

Every automated gate for the IINA pilot can pass while the app remains invisible to Siri and
Spotlight. Apple exposes no public API that drives and reads the conversational Siri surface, so
those gates cannot be automated and must never be inferred from a green build. The pilot is
therefore certified only for the claims a command settles, and the OS surfaces became **optional
observed claims** rather than a release gate: `siri-conversation` and `spotlight-ui-result` exist
in the claim catalogue, are not claimed by default, and require a ledger only when a client
explicitly asks for them.

The NetNewsWire precedent is explicit about the cost of confusing the two: metadata and tests never
prove Siri, and a case study may not exceed the status of its evidence ledger. The cost of the old
model was the opposite: a product that cannot ship because nobody was scheduled to speak to it.

## What Changes

- Prepare local, freely usable media fixtures and seed IINA's playback history with them.
- Keep the Spotlight and Siri journeys, the disambiguation case, the invented-title case and the
  deleted-file case as the content of an **optional** observation, not as a release gate.
- Have a second person reproduce the accepted flows from a clean state, only if the observation is
  claimed.
- Keep the ledger as the record of that observation, validated with
  `intentlane evidence validate --strict` when it is claimed.

## Capabilities

### New Capabilities
- `iina-live-evidence`: the IINA pilot's claimed surfaces are observed by people and recorded in a ledger.

### Modified Capabilities
- Aucun.

## Impact

Human effort only if an observed claim is requested, and a second tester in that case. Fixture files
under `pilots/iina/fixtures/media`, a ledger file in the product repository, and the pilot
documentation. No upstream change, no contact with IINA, no PR. The IINA working copy is no longer
touched by this change.
