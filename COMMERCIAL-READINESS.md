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

## Implementation offer

One domain package and two or three named journeys. Include customer-owned
native adapters, contracts, validation, automated tests, build metadata,
Shortcuts and Spotlight checks where relevant, and manual Siri evidence. End
with an evidence ledger, not a promise about future Apple model behaviour.

## Marketing gate

Publish a broad landing page only after one reproducible macOS 27 and one
reproducible iOS 27 pilot. Case studies need app-owner permission and name
actions, platform versions and observed surfaces.
