# IntentLane Siri 27 roadmap

## Outcome

Make IntentLane a truthful audit and implementation system for schema-backed
Siri and Apple Intelligence journeys in existing macOS 27 and iOS 27 apps. This
supplements the historical [ROADMAP.md](ROADMAP.md). The Apple source inventory
is [APPLE-27-APP-INTENTS-RESEARCH.md](APPLE-27-APP-INTENTS-RESEARCH.md).

## Rules

- Ship one independently verifiable slice at a time.
- Extract availability from the target SDK and compile for the customer's floor.
- Keep customer data and business logic in customer-owned adapters.
- Market a capability only after its target-platform pilot passes.

## Phase A: read-only capability auditor

Deliver `intentlane audit`, a versioned catalogue, text/JSON/SARIF output,
fixtures and stable `ILA` diagnostics as specified in
[AUDITOR-SPEC.md](AUDITOR-SPEC.md). Do not build auto-remediation, a dashboard,
a hosted scanner or source upload.

**Gate:** proceed only when an independently maintained public macOS app has a
feasible schema-backed journey. Generic shortcuts alone do not pass.

## Phase B: macOS 27 proof

Choose a public macOS content app and prove discover named content, open it and
perform one safe follow-up action. Prefer System search/open only when the app
model legitimately fits. Deliver audit baseline and delta, schema and adapter
change, `AppIntentsTesting`, extracted metadata, Shortcuts evidence, Spotlight
evidence, manual Siri evidence and a reproducibility ledger.

**Gate:** a second developer reproduces every documented layer on macOS 27.

## Phase C: iOS 27 proof

Repeat Phase B for a native iOS or cross-platform app that owns an iOS target.
Use a native development or signed-device build. Expo Go is not evidence for
native App Intents. Record availability, permissions and execution differences.

**Gate:** at least one reusable adapter or audit rule is independent of the
selected app's private architecture.

## Phase D: first complete domain package

Select one demanded domain. Add schema-complete generators, adapter interfaces,
validation, negative fixtures, `AppIntentsTesting`, metadata verification and
audit rules. Reject partial schemas instead of generating them silently.

Start with System search/open for broad content apps, then paid-pilot demand.
Keep Apple-designated Shortcuts-only document domains in a separate automation
lane.

## Phase E: advanced packages

Add only when a pilot requires them, each with syntax, audit rules, fixtures,
unit tests, system test and platform matrix:

1. Indexed entities, Spotlight and intent value queries.
2. Transferable values and cross-app handoff.
3. View annotations, donations and relevant entities.
4. Sync, ownership and sharing.
5. Rich values, unions and entity collections.
6. Long-running work, cancellation and execution targets.

## Phase F: commercial package

Publish an audit template, statement of work, engagement checklist, pricing
hypothesis, claims matrix and two public case studies. Every claim must map to
pilot evidence. The rules are in
[COMMERCIAL-READINESS.md](COMMERCIAL-READINESS.md).

## Pull request definition of done

1. Syntax, diagnostics and migration are documented.
2. Invalid tests precede generator changes.
3. Swift output is deterministic and compiles on advertised SDKs.
4. Auditor handles the new capability and missing prerequisites.
5. Risky actions have confirmation, authentication and ownership tests.
6. `pnpm test`, `pnpm build`, relevant Swift checks and `git diff --check` pass.
