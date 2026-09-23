# IntentLane: official Apple source update for the 27 releases

Research date: 23 September 2026. Scope: changes Apple documents for the 27
releases that affect IntentLane's App Intents generator, auditor, proof path,
and macOS/iOS integration. Sources below are Apple Developer documentation or
WWDC26 sessions only. Several APIs are labelled beta/preliminary by Apple, so
the final Xcode and OS SDKs remain the authority for availability and source
compatibility.

## Bottom line

IntentLane's present foundation remains useful: it emits App Intents,
App Shortcuts, scalar/enum/entity parameters, static entity resolution,
localized results and a small schema subset. However, it does not yet implement
or detect enough of Apple's 27-release features to claim a general Siri AI or
Apple Intelligence integration. In particular, the public implementation has
no generator package for schema-complete domains, semantic Spotlight indexing,
view annotations, AppIntentsTesting, cross-device identity, ownership, rich
values, or 27-release execution control.

Apple states that schemas make content and actions available through natural
language, without application-defined phrases. A generic `AppIntent` and an
`AppShortcutsProvider` remain valuable system integrations, but they are not
evidence that Siri understands the application's domain. [What's new in iOS
27](https://developer.apple.com/ios/whats-new/) and [Build intelligent Siri
experiences with App Schemas](https://developer.apple.com/videos/play/wwdc2026/240/)
are the controlling product sources for that distinction.

## 27-release deltas that need a deliberate package

| Apple capability | What Apple documents | Present IntentLane position | Launch implication |
| --- | --- | --- | --- |
| App schemas | Schemas connect entities and intents to Siri AI and Spotlight's semantic index; each must match the actual app domain. | Limited macro generation for a small schema set. No complete domain graph, schema enum, or schema-specific adapter. | Keep every Siri/Apple Intelligence claim tied to a proven schema journey, not merely a shortcut. |
| Onscreen awareness | `.appEntityIdentifier(_:)` in SwiftUI and `appEntityIdentifier` in UIKit/AppKit map visible UI to an `AppEntity`, giving conversational requests context. | No generated integration, adapter contract, audit detection or test. | Required work before promising contextual, "this item" Siri journeys. |
| AppIntentsTesting | New beta test framework invokes intents, entities and queries out of process through the same integration stack, and can verify Spotlight and view annotations without UI automation. | No XCTest template, sample target or audit evidence beyond source-pattern recognition. | Add as mandatory automated evidence for each shipped journey; retain manual Siri validation separately. |
| Entity interoperability | `SyncableEntity` marks IDs stable across devices; `OwnershipProvidingEntity` supplies sharing context for safety; `IntentValueRepresentation` bridges an entity to a system intent value; `RelevantEntities` suggests media-related content in relevant contexts. | The catalogue recognizes sync/relevance partially, but generator, adapters, ownership policy and runtime tests do not exist. | Do not advertise continuity, safe shared-item actions, cross-app values or generic proactive relevance. |
| Entity discovery | `IndexedEntity` plus indexed properties exposes entities to Spotlight; Apple positions entity schemas as inputs to the semantic index. | `IndexedEntity` is generated only for the narrow targeted schema case. There is no general indexing lifecycle, consent control, property mapping, or system proof. | Treat indexing as a privacy-reviewed package, including create/update/delete/reindex and Spotlight evidence. |
| Rich values and execution | Apple added union values, entity collections, long-running, cancellable and undoable intents, foreground/background modes and explicit execution targets. | No YAML/IR/generator/audit implementation for these contracts. | Keep them demand-gated. Add one capability at a time with cancellation, idempotency and process-isolation tests. |
| Interactive system surfaces | `RunSystemShortcutIntent` lets widgets run an App Shortcut, custom shortcut, system action or open another app. Apple lists it as iOS-only. | No WidgetKit integration or platform-specific routing. | Exclude it from macOS scope and do not treat it as a generic execution primitive. |

Apple's authoritative rolling summary is [App Intents
updates](https://developer.apple.com/documentation/Updates/AppIntents). It
lists the 27-release additions above, including `SyncableEntity`,
`OwnershipProvidingEntity`, `RelevantEntities`, `IntentValueRepresentation`,
`LongRunningIntent`, `CancellableIntent`, `UndoableIntent`, supported modes,
execution targets, `IndexedEntity`, and visual-intelligence queries.

The interaction-specific references are [providing contextual cues to Apple
Intelligence and Siri](https://developer.apple.com/documentation/appintents/providing-contextual-cues-to-apple-intelligence-and-siri),
[making App Entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight),
and [donations and discovery](https://developer.apple.com/documentation/appintents/donations-and-discovery).

## Source-specific implementation constraints

1. Apple describes `SyncableEntity` as appropriate only when an entity has the
   same identifier across devices. Where the local and durable IDs differ, the
   type uses `SyncableEntityIdentifier`; it is not a cosmetic protocol marker.
   [SyncableEntity](https://developer.apple.com/documentation/appintents/syncableentity)

2. `OwnershipProvidingEntity` supplies sharing state so the system can request
   confirmation with appropriate context for destructive or sensitive work on
   shared or public entities. This must join IntentLane's existing confirmation
   and authentication policy rather than replace it. [OwnershipProvidingEntity](https://developer.apple.com/documentation/appintents/ownershipprovidingentity)

3. AppIntentsTesting is marked beta. Its tests live in a standard XCUITest
   bundle, identify an app by bundle ID, execute it separately from the test
   process, and can verify query, Spotlight and view-annotation behavior.
   It improves runtime integration coverage but cannot be used to claim that a
   natural-language Siri phrase was manually observed. [AppIntentsTesting
   documentation](https://developer.apple.com/documentation/appintentstesting)
   and [WWDC26 testing session](https://developer.apple.com/videos/play/wwdc2026/295/)

4. Apple recommends a staged validation path: AppIntentsTesting first, then
   Shortcuts to inspect presentation and parameter shape, Spotlight to inspect
   content discovery, and finally a full Siri experience. That preserves the
   repository's rule that metadata and build success never substitute for a
   real Siri proof. [WWDC26 App Schemas session](https://developer.apple.com/videos/play/wwdc2026/240/)

5. macOS 27 and iOS 27 share the broad App Intents positioning, but each API
   and schema must still be checked in the installed target SDK. Apple's
   current documentation explicitly labels portions of the new surface beta,
   and the developer landing pages point to Xcode 27 beta. Do not derive a
   blanket dual-platform availability rule from the marketing overview.
   [What's new in macOS 27](https://developer.apple.com/macos/whats-new/) and
   [Apple developer updates](https://developer.apple.com/documentation/updates?changes=__2)

## Read-only code comparison

The audited source currently has direct generation or detection for
`AppIntent`, `AppShortcutsProvider`, basic `AppEntity` queries, a limited
`@AppIntent(schema:)` and `@AppEntity(schema:)` set, confirmation,
authentication, snippets and metadata extraction. The capability catalogue
already names `IndexedEntity`, `Transferable`, `RelevantEntities`,
`SyncableEntity`, long-running work and AppIntentsTesting, but naming them in
an audit catalogue is not an adapter, lifecycle implementation or platform
proof.

Absent from the codebase are detections and/or implementation packages for
`OwnershipProvidingEntity`, view annotations, `IntentValueRepresentation`,
`EntityCollection`, union values, cancellability, undo, modes, execution
targets, `RunSystemShortcutIntent`, and an AppIntentsTesting XCTest workflow.
The catalogue must be refreshed against the final SDK before it is used as a
marketing availability source.

## OpenSpec decomposition recommended by the evidence

The current closure plan correctly keeps advanced work demand-gated. If a
pilot requests it, split the work into independently shippable OpenSpecs in
this order:

1. **Schema-complete Siri journey**: one real schema domain and its entities,
   queries, required properties, actions, negative cases, generated metadata,
   AppIntentsTesting and manual Siri ledger on macOS and/or iOS.
2. **Spotlight and onscreen context**: explicit opt-in/privacy model, indexed
   property map and lifecycle, `IndexedEntity`, view annotations for SwiftUI,
   UIKit and AppKit where applicable, and Spotlight/view-annotation tests.
3. **Entity safety and continuity**: stable-ID adapter, `SyncableEntity`,
   ownership states, confirmation/authentication behavior, transfer boundary,
   revocation and cross-device fixtures.
4. **Advanced intent execution**: value/collection representation, long work,
   progress, timeout and cancellation cleanup, undo, supported modes and
   execution targets. Specify iOS and macOS separately.
5. **Interactive widget actions**: `RunSystemShortcutIntent` as an
   iOS-only package, with widget extension ownership, permissions and device
   tests.

No item is launch-critical until a buyer's documented journey requires it.
For the currently declared launch promise, the critical remaining work is
proof and release discipline: reconcile the claims ledger, finish evidence
validation and audit baselines, run independent macOS and iOS pilots, complete
the external quickstart and publish only claims supported by those ledgers.
