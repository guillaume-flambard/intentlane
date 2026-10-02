## 1. Schema

- [x] 1.1 Add `pilot-evidence/1.1` with an `observations` array and a `current`
  observation id, in `packages/core/src/pilot-ledger.ts`.
- [x] 1.2 Keep `pilot-evidence/1.0` valid, read as a single observation.
- [x] 1.3 Reject a 1.1 ledger that also carries the flat observation fields at
  the root, and reject a `current` that names no recorded observation.
- [x] 1.4 Compute the status from the current observation; preserve every other
  observation and check it for shape without letting its layers gate the status.

## 2. Evidence

- [x] 2.1 Add a fixture with a historical observation that fails Siri and a
  current observation that passes, and assert the ledger reads verified while the
  history is preserved.
- [x] 2.2 Add a fixture whose current observation fails, and assert the ledger
  reads unverified even though an earlier observation passed.
- [x] 2.3 Keep the existing 1.0 fixtures and their diagnostics unchanged.

## 3. Documentation

- [ ] 3.1 Record in the pilot playbook how to add an observation and move
  `current` without touching an earlier one.
- [ ] 3.2 When the 26A434 observation is actually made, convert
  `PILOT-NETNEWSWIRE-LEDGER.yaml` to 1.1 with the 26A428 observation preserved
  verbatim and the new one current. This step is not done until the observation
  exists.
