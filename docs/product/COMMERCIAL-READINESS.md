# IntentLane commercial readiness

## Position

IntentLane assesses and implements the Apple-standardised actions and content
that macOS and iOS apps can expose through Siri, Apple Intelligence, Shortcuts,
Spotlight and related surfaces. It does not promise universal voice control or
arbitrary language understanding.

## Claims matrix

| Maturity | Permitted claim | Required proof | Offered today |
| --- | --- | --- | --- |
| Auditor | We identify App Intents and schema gaps in your repository. | Deterministic fixtures and a real audit. | yes |
| Build | We implement verified App Intents for your target SDK. | Build, metadata and tests. | yes |
| Surfaces | The generated entity is accepted by a named Core Spotlight index and a removal is provable by test. | A real named index, a refresh cycle, and a tracked set. | yes, in that wording |
| Siri journey | **Not offered.** | A named journey observed on a screen and reproduced by a second person. | **no** |
| Domain package | **Not offered.** | Two independent pilots, at least one with the observed layers. | **no** |

Shortcuts-only domains are automation support, not Siri or Apple Intelligence
discovery. Every proposal names platform and OS version.

### Two rows were removed from this table, and why

Both were removed because `CLAIMS-REGISTRY.md` forbids the claim, not because the
claim is unattractive. This is the offer-gate review, and the register is the
authority it is reviewed against.

**"The explicitly contracted surface appears in Spotlight or Shortcuts" is gone.**
Nothing was observed in Spotlight by any pilot, and it cannot be: Core Spotlight
offers no read-back of a named index, so no command a person runs can show a result
surfacing. What the five certified pilots prove is that a **named index accepts the
generated entity**, that a refresh cycle succeeds against a real `CSSearchableIndex`,
and that a removal is provable by test. The register calls that row
`Partially proven` and adds, in its own words, that what Spotlight displays is not
observed. "Appears in Spotlight" is a stronger sentence than the register allows,
and the replacement above is the strongest sentence the evidence does support.

**"We validated named journeys on macOS 27" is gone, and the row is kept as
`Not offered` rather than deleted.** The evidence the row asked for is the full
pilot evidence ladder, and on every pilot the ladder stops two rungs below the top:
`siri-conversation` is `Awaiting proof` in the register with the evidence field
reading `None`, because no process can drive Siri. A registered intent is a
prerequisite for a conversation, not a demonstration of one. Keeping the row visible
with `no` in the last column is deliberate: a reader who arrives looking for a Siri
claim should find the reason here rather than find silence and assume the question
was not understood.

**The same reason removes `Domain package`.** It required two independent pilots,
and there are now five, but it also required the ladder, and the ladder is not
climbed. Four domains with a readable model are not a domain package; they are the
evidence that the method is portable, which is a weaker and more honest claim and is
what the campaign's results document makes.

## Fixed-scope entry offer

**Siri and Apple Intelligence compatibility audit**

Inputs: one repository, one target platform, one architecture walkthrough and
up to three candidate journeys.

Deliverables: per-target evidence report, feasible schema and entity map,
implementation and safety gaps, platform risks, and a fixed implementation plan
with acceptance evidence.

Exclusions: implementation, App Store submission, production data access,
guaranteed language outcomes, third-party credentials and unsupported domains.

The delivery template for this offer, including the report blocks the auditor
produces, the engagement checklist and the handoff, is in
[AUDIT-OFFER.md](AUDIT-OFFER.md).

Every statement this repository publishes, with its evidence and its status, is in [CLAIMS-REGISTRY.md](../spec/CLAIMS-REGISTRY.md). A claim is only publishable at or below its status.

## Implementation offer

One domain package and two or three named journeys. Include customer-owned
native adapters, contracts, validation, automated tests, build metadata, and
Spotlight index checks, and Shortcuts checks only where explicitly requested. End
with an evidence ledger, not a promise about future Apple model behaviour.

**What was removed from that paragraph, and why.** It used to end with "plus
manual Siri evidence". The campaign removed it, because no pilot produced a single
observed claim across five certified applications, and because a deliverable that
promises something the offer-gate review cannot evidence is the failure this
repository was built to prevent. The paragraph now promises index checks, which are
measured, and the ledger, which records what was not observed rather than leaving
that unsaid.

**A client asking for Siri evidence gets a conversation, not a deliverable.** The
honest answer is that the Siri conversation is observed by a person on a screen and
reproduced by a second person, that it is not yet done for any application, and
that the audit tells them what would make it likely to work. Offering it as a line
item would mean either promising it before it is measured or taking money for a
prediction.

## Marketing gate

Publish a broad landing page only after one reproducible macOS 27 and one
reproducible iOS 27 pilot. Case studies need app-owner permission and name
actions, platform versions and observed surfaces.

## Evidence ledger gate

No case study may exceed the computed status of its pilot evidence ledger.
A study is publishable only when `intentlane evidence validate --strict`
reports `verified` for its ledger. An `unverified` ledger keeps the pilot as
feedback, never as marketing. Each published study references its ledger, and
the ledger references the audit baseline and delta it was checked against.

## Future direction: IntentLane Observe

IntentLane Observe is a future, post-integration capability, envisaged later. It
is not a current feature and it is not an implementation commitment. It is
planned as a Pro module or add-on rather than a separate brand at the start, and
it does not change the main promise: turning an existing app that is not
Siri-compatible into one that is, by auditing, generating, integrating and
verifying the App Intents and the native components they need.

### What it would cover

Observe, on the application side, which intents were actually received and
executed in production. Where it is relevant and safe to collect, it would
expose:

- execution volume per action;
- successes and failures;
- latency and timeouts;
- friction around confirmations;
- regressions tied to an app release, an OS release or a schema change;
- execution context, when that context can be collected safely.

### Why the gap exists

Apple provides the system foundations: it executes and routes App Intents, it
offers system suggestions and donations, and it ships pre-production testing
through `AppIntentsTesting`. The public Apple framework does not give an app
publisher production product observability per intent: no execution volumes, no
outcomes, no latency or timeouts, no confirmation friction and no regressions by
app, OS or schema version.

Observe would cover that gap and nothing else. It would be app-side telemetry,
recorded after an intent has reached the application.

### Privacy limits

- It never claims access to raw Siri utterances.
- It never claims knowledge of Siri's private routing decisions.
- It never claims to see requests Siri never routes to the application.
- Its telemetry must be minimised and privacy-respecting, and it does not change
  the auditor, which stays local: no source, telemetry, secret or proprietary
  data leaves the machine.
