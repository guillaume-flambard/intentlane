## Why

`vérifierAccès` now exists as a named decision with its rules named, and a test can ask it for a
refusal. It exists only in Swift.

The contract does not mention it. `pilots/iina/contract.yaml` declares the entity, its identifier
and its display, and the two intents, and says nothing about when any of that may be exposed. So
the contract and the code disagree about what the integration offers, and a reader of the contract
alone would conclude that the entity is always exposed.

That is the same class of gap as the one already paid for twice on this pilot. The rule lived in
the recipe while the spec said it was optional, and the weaker document won. Here the rule lives
in the adapter while the contract does not mention it at all, and the contract is the document a
client and a reviewer read.

There is a second reason, and it is the one that matters commercially. "Expose one media item" and
"expose every media item" are two different offers. A client who reads the contract cannot tell
which one IINA is selling, because the contract does not say that exposure is conditional at all.
The condition is the offer.

## What Changes

- The configuration schema gains an exposure condition on an entity, and rejects a form that names
  no rule, because a condition that cannot fail is decoration.
- `pilots/iina/contract.yaml` declares its condition: nothing is exposed while history recording is
  off, and nothing is exposed when the file is gone.
- A check reports a contract that declares an entity with no condition, so a future pilot cannot
  quietly ship the unconditional form.

## Capabilities

### New Capabilities
- `pilot-access-contract`: an entity's exposure condition is declared in the contract, validated by
  the schema, and reported when missing.

### Modified Capabilities
- None. No existing requirement changes; this adds a requirement the contract did not have.

## What this does not do

- It does not make the condition configurable per client. There is exactly one shape today, and a
  general expression language would be a promise the implementation cannot keep.
- It does not add the condition to the generated entity. App Intents has no place to put it, and
  inventing one would be a claim about the system that cannot be checked.
- It does not change any runtime behaviour. The Swift rule already exists and is already tested.
  This makes the contract tell the truth about it.
