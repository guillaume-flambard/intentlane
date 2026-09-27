# Tasks

The rule from the recipe, applied here: a stage is finished when a command exits
zero. Nothing below is finished, and this change ships no claim.

## 0. What the review found, before any work

- [ ] 0.1 Correct the proof column. `QUALIFICATION.md` lists 24, 30 and 9 tests
      under a column headed "Preuve" while all three are marked in progress, and
      `tests/` was empty when this change was created. Either the tests exist and
      the counts are right, or the counts come out. A number in a proof column
      for work that has not happened is the exact thing this campaign measures
      itself against.
- [ ] 0.2 Give the three declared gates a real command, or take them out of
      `pilot.yaml`. `applicationTests`, `integrationTests` and `indexSync` point
      at `tests/run-all-tests.sh`, `tests/run-integration-tests.sh` and
      `tests/run-index-tests.sh`, none of which exists. A manifest that declares
      three proofs no command can produce is worse than one that declares none.
- [ ] 0.3 Reconcile the claim set with the documented pilot, or state why it
      differs. `docs/pilots/PILOT-NETNEWSWIRE.md` records five proved journeys at
      the same revision. The contract declares three intents. Both may be true,
      but a reader has to be told which set the manifest certifies.
- [ ] 0.4 Decide what happens to `docs/pilots/PILOT-NETNEWSWIRE.md` and
      `PILOT-NETNEWSWIRE-LEDGER.yaml` when the migration lands. A ledger that
      points at a prose record while a contract record also exists is two
      sources of truth for one pilot, and the ledger is the one that certifies.

## 1. Build the object, before the contract is trusted

- [ ] 1.1 Apply the stage 0 entry conditions, with
      `scripts/can-this-build-compile-swift.sh` run first. This application is
      Swift-native, so the check is expected to answer `YES`, and it is still run
      because the recipe asks before the contract is written and not after.
- [ ] 1.2 Read the model, and confirm the object. The classification in
      `QUALIFICATION.md` says `Article` with `guid`, exposing only the
      identifier, the title and the feed name, and that the article body is the
      sensitive payload. Confirm it against the code rather than adopting it.
- [ ] 1.3 Confirm the exposure rules. `source_disabled` for a feed that has never
      synced, and `item_missing` for an item removed from the store. The second
      one is the same claim Transmission deliberately did not make, and it needs
      an observation here or it does not go in.

## 2. Prove it, then move it

- [ ] 2.1 Three suites, test-first, including the exact negative: an invented
      title must resolve to no entity and never to a neighbouring one. The
      documented pilot already proves that behaviour, so the suite has to prove
      it for the contract's entity, not reuse the old result.
- [ ] 2.2 Extract the metadata and read it back. The claim is one entity and
      exactly the declared intents, with no App Shortcut added by accident.
- [ ] 2.3 `verify --strict` exits zero on the declared claim set.
- [ ] 2.4 Only then move the material to `pilots/netnewswire/`, and only then
      reconcile the ledger. **This task is the reason the material lives here.**
      A migration that lands unproved would put two NetNewsWire pilots at one
      revision, and the ledger is the artefact that certifies.
