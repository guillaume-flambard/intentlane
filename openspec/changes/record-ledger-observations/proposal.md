## Why

A ledger records one observation of a pilot. When the same pilot is observed
again under a new system build, the new result has nowhere to go: the ledger
either overwrites the earlier observation, which rewrites history, or a second
file appears, and the notion of which observation is current leaves the model.

The NetNewsWire pilot is about to be observed again under macOS 27.0.1 build
26A434, after the 2026-09-23 observation under 26A428. The 26A428 result is
historical evidence and must be preserved exactly; the 26A434 result must be
recordable beside it, and the ledger must report the current one.

## What Changes

- Add a ledger schema `pilot-evidence/1.1` that carries an `observations` array
  and names the `current` observation. Each observation holds its own revision,
  conditions, journeys, reproduction and artifact references.
- Keep `pilot-evidence/1.0` valid and read it as a single observation, so every
  existing ledger keeps working and producing the same diagnostics.
- Compute the ledger status from the current observation only. An earlier
  observation is preserved and checked for shape, but its failed layers do not
  gate the current verdict.

## Capabilities

### Modified Capabilities
- `pilot-evidence-ledger`: the ledger can hold more than one observation of the
  same pilot, and says which one is current.

## Impact

`packages/core/src/pilot-ledger.ts`, the ledger fixtures and their tests, and the
pilot playbook. No upstream change, no contact, no PR. Existing 1.0 ledgers are
unchanged.
