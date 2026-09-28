# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-09-27

## Product Overview

**One-liner:** IntentLane tells an iOS or macOS team which Siri and Apple Intelligence journeys its app can actually support, then delivers the native integration with evidence.

**What it does:** IntentLane audits an existing Apple app, maps feasible actions and entities to Apple App Intents and App Schemas, and separates implementation signals from proof on Siri, Spotlight, and Shortcuts. A fixed implementation engagement can then deliver two or three named journeys, customer-owned adapters, tests, metadata checks, and a final evidence ledger.

**Product category:** Apple Intelligence integration audit and implementation.

**Product type:** Productized B2B service backed by deterministic developer tooling.

**Business model:** Fixed-scope compatibility audit first. A bounded implementation sprint follows only when the audit identifies a useful and feasible journey. Recurring verification is a future option, not a current offer.

## Target Audience

**Target companies:** Teams shipping an existing iOS or macOS app with clear domain objects and actions, an Apple user base, and a credible Siri, Spotlight, Shortcuts, or Apple Intelligence use case.

**Decision-makers:** Founder, CTO, Head of Mobile, Head of iOS or macOS, and the engineering lead responsible for native platform integration.

**Primary use case:** Decide which Apple Intelligence journeys are worth building before spending weeks on the wrong framework, schema, or surface.

**Jobs to be done:**

- Audit what the current repository already exposes and what remains unproven.
- Select up to three valuable journeys and map the required App Intents, entities, schemas, and safety constraints.
- Implement the selected journeys with build, metadata, automated, and human acceptance evidence.

**Use cases:**

- Distinguish a Shortcuts integration from schema-backed Siri or Apple Intelligence discovery.
- Assess a native or cross-platform app before committing engineering time.
- Add Apple system actions without letting generated code own the app's data or navigation.
- Produce a reproducible evidence ledger for a release or stakeholder review.

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Founder or product lead | A differentiated user journey and a credible delivery plan | Cannot tell which Apple capabilities are real, relevant, or ready | A bounded answer tied to named user journeys, risks, and acceptance evidence |
| Mobile engineering lead | Architecture, scope, maintainability, release risk | Apple APIs span frameworks, schemas, metadata, OS versions, and manual surfaces | A target-specific plan and implementation that leaves business logic in app-owned adapters |
| Senior iOS or macOS engineer | Correct symbols, platform behavior, tests, debuggability | A green build can still hide missing discovery or a broken system journey | Deterministic tooling plus explicit automated and human proof gates |
| Financial buyer | Fixed exposure and a useful deliverable | Open-ended R&D is hard to budget | A fixed-scope audit before any larger implementation commitment |

## Problems & Pain Points

**Core problem:** Apple Intelligence integration is easy to overclaim. App Intents can compile while the intended Siri, Spotlight, or Shortcuts journey remains undiscoverable or unverified.

**Why alternatives fall short:**

- Reading Apple documentation explains the APIs but does not map them to one app's domain and repository.
- A generic development agency may implement code without separating metadata, automated tests, and observed system behavior.
- A build or extracted metadata proves registration, not that Siri understands and completes the named journey.
- Starting with implementation commits the team before product value, schema fit, and platform constraints are clear.

**What it costs them:** Mis-scoped engineering work, delayed launches, fragile integrations, and claims the team cannot reproduce.

**Emotional tension:** The team sees a strategic Apple opportunity but cannot tell whether it has a one-week integration, a platform limitation, or a demo that will fail outside the engineer's Mac.

## Competitive Landscape

**Direct:** Specialist App Intents consultants and native Apple agencies. They compete for the same implementation budget; IntentLane differentiates through a fixed audit, deterministic evidence, and explicit claim boundaries.

**Secondary:** Internal iOS or macOS engineering teams using Apple documentation. They know the product deeply but may not have current App Schemas and system-surface expertise or time to build a reusable proof process.

**Indirect:** Generic AI coding tools and development agencies. They can write Swift but do not by default establish that the right domain, surface, and human journey were selected and observed.

## Differentiation

**Key differentiators:**

- Evidence is attached to each claim, platform, SDK, target, and named journey.
- The auditor is read-only, local by default, deterministic, and leaves the inspected repository unchanged.
- Shortcuts automation, schema-backed discovery, build metadata, and live system behavior remain separate statuses.
- Generated seams stop at app-owned adapters, so the customer's data and navigation logic stay under customer control.
- The engagement begins with one repository, one platform, and up to three journeys.

**How we do it differently:** IntentLane starts from the app's business objects and user journeys, inspects the actual code and SDK, then produces a feasible map and acceptance plan before implementation.

**Why that's better:** The buyer gets a useful decision even if implementation should not proceed, and every later claim has a defined proof requirement.

**Why customers choose us:** They need a fast, bounded answer from someone who understands both Apple platform constraints and the difference between code that compiles and a journey users can complete.

## Objections

| Objection | Response |
|-----------|----------|
| Our iOS team can read Apple's documentation. | The audit does not replace platform engineers. It gives them a repository-specific map, names the unknowns, and prevents a broad research phase from becoming an open-ended implementation. |
| Siri behavior is probabilistic, so nobody can guarantee it. | Correct. IntentLane guarantees the scope and evidence process, not Apple's language behavior. Human Siri observations remain separate from automated proof. |
| We do not want a generator owning our architecture. | It does not. Business lookup, permissions, navigation, and side effects stay in customer-owned adapters. |
| We are not ready for implementation. | The audit is independently useful. It can conclude that a journey is blocked, low value, or out of scope. |

**Anti-persona:** Web-only products with no native Apple target, idea-stage apps with no stable domain model, teams seeking universal voice control, and buyers who require a guaranteed natural-language outcome.

## Switching Dynamics

**Push:** Repeated uncertainty, prototype code that never reaches a system surface, and conflicting claims about what a green build proves.

**Pull:** A fixed scope, a repository-specific answer, named journeys, and evidence that can be reviewed by product and engineering.

**Habit:** Keeping Apple Intelligence in the backlog, adding isolated shortcuts, or assigning exploratory work to an engineer without a product gate.

**Anxiety:** Giving source access, introducing generated code, depending on one consultant, or paying for an integration Apple may not support. The read-only local audit and customer-owned adapter boundary address these concerns.

## Customer Language

**How they describe the problem:**

- "We know App Intents matter, but we do not know what our app can expose safely."
- "We have shortcuts. Does that mean Siri and Apple Intelligence can use them?"
- "Before we commit a sprint, tell us which user journeys are actually feasible."

**How they describe us:**

- "The audit that tells us what is real, what is missing, and what to build next."
- "A specialist who can take the integration from repository evidence to a tested Apple journey."

**Words to use:** audit, named journey, evidence, platform-specific, fixed scope, app-owned adapter, feasible, verified, Apple Intelligence integration.

**Words to avoid:** magic, automatic compatibility, universal Siri support, one-click, guaranteed understanding, autonomous integration.

**Glossary:**

| Term | Meaning |
|------|---------|
| Journey | A named user action and the app content it acts on |
| Evidence ledger | The record of automated checks, human observations, conditions, and unresolved unknowns |
| Schema-backed | An action and entity mapped to an Apple App Schema rather than exposed only as a shortcut |
| App-owned adapter | Customer code that resolves data, permissions, navigation, and side effects behind generated interfaces |
| Verified | Supported by the required evidence for that specific claim and surface |

## Brand Voice

**Tone:** Calm, precise, candid, and commercially direct.

**Style:** Lead with the buyer's decision and the named journey. State platforms, conditions, evidence, and unknowns plainly. Explain framework details only when they change scope or risk.

**Personality:** Specialist, pragmatic, rigorous, transparent.

## Proof Points

**Metrics:** The live CI workflow owns the current automated test status. The
claims registry owns the count and status of publishable claims; this document
does not duplicate either number.

**Public evidence:** Public-repository pilots provide automated audit and
integration evidence. No public case study claims a verified Siri conversation.

**Value themes:**

| Theme | Proof |
|-------|-------|
| Honest qualification | Claims registry separates proven, partial, and awaiting proof states |
| Deterministic audit | Same repository and inputs produce the same report without modifying the target |
| Native implementation | Generated Swift builds for iOS and macOS targets, with customer-owned adapter seams |
| Surface honesty | Siri, Spotlight, and Shortcuts observations remain separate from build and metadata checks |

## Public conversion

The repository offers two clear next steps: run the published read-only audit on
a non-confidential application, or discuss one existing iOS or macOS app and up
to three candidate journeys privately with the maintainer.

## Changelog

*Newest first. One line per revision: what changed and why.*

- v1 (2026-09-27) - Initial context. Positioned IntentLane as a fixed-scope Apple Intelligence audit and implementation offer for existing iOS and macOS apps.
