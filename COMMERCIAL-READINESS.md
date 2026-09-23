# IntentLane commercial readiness

## Position

IntentLane assesses and implements the Apple-standardised actions and content
that macOS and iOS apps can expose through Siri, Apple Intelligence, Shortcuts,
Spotlight and related surfaces. It does not promise universal voice control or
arbitrary language understanding.

## Claims matrix

| Maturity | Permitted claim | Required proof |
| --- | --- | --- |
| Auditor | We identify App Intents and schema gaps in your repository. | Deterministic fixtures and a real audit. |
| Build | We implement verified App Intents for your target SDK. | Build, metadata and tests. |
| Surfaces | Selected actions appear in Shortcuts and, where applicable, Spotlight. | Installed-app evidence. |
| Siri journey | We validated named journeys on macOS 27 or iOS 27. | Full pilot evidence ladder. |
| Domain package | We support the named domain and documented journeys. | Two independent pilots. |

Shortcuts-only domains are automation support, not Siri or Apple Intelligence
discovery. Every proposal names platform and OS version.

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

Every statement this repository publishes, with its evidence and its status, is in [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md). A claim is only publishable at or below its status.

## Implementation offer

One domain package and two or three named journeys. Include customer-owned
native adapters, contracts, validation, automated tests, build metadata,
Shortcuts and Spotlight checks where relevant, and manual Siri evidence. End
with an evidence ledger, not a promise about future Apple model behaviour.

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
