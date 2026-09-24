## Why

IntentLane has one RSS reader and one local media player. Two domains, and no
evidence that the integration method repeats. Before the offer is positioned as
repeatable, the method has to survive five materially different data and action
models.

The previous version of this change asked each pilot to prove Spotlight and Siri
journeys. That is now known to be the wrong instrument, twice over. No public
API can drive Siri or read a named Core Spotlight index back, so those journeys
can only be settled by a person, at five times the cost, which makes them the
thing most likely to be skipped. And a Siri conversation is an anecdote. What a
buyer needs to know is how long the work takes, what it costs, and whether the
same steps work on the next app.

## What Changes

- Define a validated pilot as a **certified claim set**: a `pilot.yaml` whose
  deterministic claims all pass `intentlane verify --pilot --strict`, on a
  fixture-backed minimal mapping in an isolated fork of a public repository.
- Measure repeatability instead of asserting it, with two instruments nobody has
  built yet: a per-pilot **deviation log**, naming every place the shared recipe
  had to bend for that app, and a per-stage **effort measurement**, so the offer
  can be priced from data instead of guessed.
- Keep the observed claims available and optional, claimed on at most one pilot,
  and recorded as an observation rather than as a gate.
- Keep the gate at three independent, reproducible validations in different
  business domains. Five remain the research set.
- Reject a candidate when its data cannot be safely represented or indexed,
  before any code is written.

No upstream pull request or maintainer contact is implied by this change. Those
happen only after a local proof, a review of each repository's contribution rules
and a maintainer-approved proposal.

## Capabilities

### New Capabilities
- `pilot-campaign`: a pilot is validated by a certified claim set, and
  repeatability is measured by a deviation log and an effort measurement rather
  than claimed from a handful of anecdotes.

### Modified Capabilities
- Aucun.

## Impact

Five isolated forks, one shared recipe document that is versioned and amended
across pilots, one measurement sheet, and the ledger files. No upstream change,
no maintainer contact, no PR. Each pilot's own claim set lives in its repository
or in `pilots/<name>/` here, depending on where the fork lives.
