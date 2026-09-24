## Why

Every automated gate for the IINA pilot can pass while the app remains invisible to Siri and
Spotlight. Apple exposes no public API that drives and reads the conversational Siri surface, so
those gates cannot be automated and must never be inferred from a green build. The pilot is
currently at `awaiting-live-evidence`: contract, generation, business tests and metadata pass, and
nothing has been observed by a person.

The NetNewsWire precedent is explicit about the cost of skipping this: metadata and tests never
prove Siri, and a case study may not exceed the status of its evidence ledger.

## What Changes

- Prepare local, freely usable media fixtures and seed IINA's playback history with them.
- Observe and record the Spotlight journey: a result attributed to IINA that opens the exact media.
- Observe and record the Siri journey, including the disambiguation prompt when two media share a
  visible title.
- Observe and record the negative journey: an invented title opens nothing and selects no neighbour.
- Have a second person reproduce the accepted flows from a clean state.
- Enter the results in the pilot evidence ledger and validate it strictly.

## Capabilities

### New Capabilities
- `iina-live-evidence`: the IINA pilot's claimed surfaces are observed by people and recorded in a ledger.

### Modified Capabilities
- Aucun.

## Impact

Human effort on the pilot machine and a second tester. Fixture files under
`pilots/iina/fixtures`, a ledger file in the product repository, and the pilot documentation.
No upstream change, no contact with IINA, no PR.
