# Migrate the NetNewsWire pilot to the contract convention

## Why

Three of the four pilots in `pilots/` describe themselves the same way: a
`contract.yaml` a `pilot.yaml` declares, and test scripts in `tests/` that a
command runs. NetNewsWire was the exception. It had a hand-written integration
proved in a fork and recorded as prose under `docs/pilots/`, with no contract and
no machine-checkable gates.

That prose is a real proof and is not being touched. `PILOT-NETNEWSWIRE-LEDGER.yaml`
points at it, and it records five of five integration tests passing on build
26A428. This change is about giving the same pilot the same shape as the others,
so that what a client reads is declared rather than narrated.

**The contract is a migration, and it replaces a certified artefact.** That is
why nothing here is committed to `pilots/` yet. A migration that lands before it
is proved would leave two NetNewsWire pilots at the same revision, one certified
and one not, and a ledger pointing into that contradiction.

## What this change holds, and what it does not

It holds the material, the review, and the work. It does not certify anything.

The three files moved here from an untracked `pilots/netnewswire/` draft:

- `contract.yaml` — validates. `Valid IntentLane 0.1: 3 intent(s) ready.`
- `pilot.yaml` — **its three gates point at scripts that do not exist.**
- `QUALIFICATION.md` — **its proof column states test counts for tests that do not
  exist**: 24, 30 and 9, every one of them marked in progress.

Both defects are recorded as tasks rather than quietly corrected, because the
second one is the failure this campaign exists to prevent: a number in a column
headed "proof" for work that has not happened.

## What the review found, and what it did not decide

The review could not tell whether this contract **replaces** the documented
pilot or **duplicates** it. Same application, same revision
(`0184ca38c586078117a21f96f68eef78d39b8f68`), same object (an article, with
`guid` as the identifier), and a different claim set. The owner decided it is a
migration, which is recorded here as a decision and not as a fact the review
established.

## Impact

No product code, no output format, no existing pilot. `pilots/netnewswire/` is
recreated only when the gates pass. The documented pilot and its ledger are
unchanged, and if the migration is never finished, the only loss is this
directory.
