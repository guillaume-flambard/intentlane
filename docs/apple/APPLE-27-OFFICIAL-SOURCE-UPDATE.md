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

## Catalogue revalidation against the installed SDK

The local toolchain reports macOS 27.0 (build 26A428), Xcode 27.0 (build
27A266a), SDK `macosx27.0` and SDK `iphoneos27.0`, with
`SDKSettings.json` defaulting both SDKs to deployment target 27.0. The
authority for every availability below is the Swift interface at
`MacOSX27.0.sdk/System/Library/Frameworks/AppIntents.framework/Modules/AppIntents.swiftmodule/arm64e-apple-macos.swiftinterface`,
read with `grep -B3` on each declaration, plus the CoreTransferable interface
for `Transferable`.

Eleven entries were wrong and are corrected:

| Capability | Was | Now | Source line |
| --- | --- | --- | --- |
| discovery.intent-value-query | 14.0 / 17.0 | 26.0 / 26.0 | 4401, `IntentValueQuery` is `anyAppleOS 26.0` |
| discovery.indexed-entity | 14.0 / 17.0 | 15.0 / 18.0 | 2608, `IndexedEntity` is macOS 15 / iOS 18 |
| discovery.spotlight-lifecycle | 14.0 / 17.0 | 15.0 / 18.0 | 363, `indexAppEntities` and `deleteAppEntities` are macOS 15 / iOS 18 |
| cross-app.transferable | 14.0 / 17.0 | 13.0 / 16.0 | CoreTransferable 237, `Transferable` is macOS 13 / iOS 16 |
| relevance.donations | 14.0 / 17.0 | 13.0 / 16.0 | 4285, `IntentDonationManager` is macOS 13 / iOS 16 |
| relevance.relevant-entities | 14.0 / 17.0 | 27.0 / 27.0 | 4837, `RelevantEntities` is `anyAppleOS 27.0` |
| relevance.syncable-entity | 14.0 / 17.0 | 27.0 / 27.0 | 2651, `SyncableEntity` is `anyAppleOS 27.0` |
| execution.long-running | 14.0 / 17.0 | 27.0 / 27.0 | 3602, `LongRunningIntent` is `anyAppleOS 27.0` |
| execution.live-activity | iOS 16.1 | iOS 17.0 | 253, `LiveActivityIntent` is iOS 17.0 and unavailable on macOS |
| proof.confirmation | 13.0 / 16.0 | 15.0 / 18.0 | 3217, the `conditions:actionName:dialog:` overload the generator emits is macOS 15 / iOS 18 |
| proof.spotlight-surface | 14.0 / 17.0 | 15.0 / 18.0 | 363, the Spotlight indexing surface is macOS 15 / iOS 18 |

Two deliberate choices stay as they were:

- The four `semantics` entries remain 27.0 / 27.0. The macros themselves are
  iOS 18 / macOS 15 (lines 10944, 10769, 10625) and the `AppSchema` struct is
  iOS 18 / macOS 15 (line 10593), but the useful conformance (domain members
  such as `.reader.page` and `.reader.openPage`) is `anyAppleOS 27.0`. The
  catalogue describes the capability a pilot can actually use, which is the 27
  surface.
- `proof.app-intents-testing` keeps 15.0 / 18.0. `AppIntentsTesting` is not
  present in the installed SDK at all: no framework matches
  `System/Library/Frameworks/AppIntentsTesting*` and the interface never
  mentions it. The value comes from Apple's documentation, not from the SDK,
  and is flagged here as unverifiable on this machine.

One test locks these numbers: `packages/core/src/audit-catalogue.test.ts`
carries a `matches the availability the installed App Intents SDK declares`
case that fails when an entry drifts from the table above.

## Contract floor decision

The 0.1 contract carries `min_ios` only. There is no `min_macos`, and that
stays true for 0.1 for three reasons.

First, the contract describes one Apple target and its iOS floor, which is what
the generator and the plugin need. Second, the audit does not need the contract
to carry a macOS floor: `intentlane audit --platform macos` reads the target
platform from the flag and the floor from `--min-macos` or the installed SDK. A
second floor in the contract would duplicate a value the audit already derives
from the toolchain, and two sources of truth for the same floor is how a report
starts lying.

Third, the concern behind the task is closed by the catalogue revalidation
above. A capability that macOS does not ship now reports `unsupported` with
`ILA100` because the catalogue holds the real per-platform availability, so an
iOS-only API can no longer be presented as an iOS promise while macOS stays
silent. Adding `min_macos` to the schema is therefore a 0.2 candidate, recorded
in `MIGRATION.md`, not a 0.1 change.

## Known Apple 27 limitation: `OpenIntent` selection with several entity types

macOS 27 can pick the wrong entity type for `OpenIntent` when more than one
entity type coexists and more than one schema-conformant `open` intent targets
different types. The system resolves the open request by entity type, so two
open intents over two entity types make the selection ambiguous.

This does not touch the chosen journeys today. The NetNewsWire fork has exactly
one entity type (`IntentLaneArticleEntity`, conformed to `reader.page`) and one
`open` intent (`OpenArticle`, conformed to `reader.openPage`), so the selection
is unambiguous and the extracted metadata shows one `OpenEntity` conformance.

The limitation is recorded here with the fixture to build the day a second
entity type appears. That fixture is a contract with two entities declared
(`article` conformed to `reader.page` and `collection` conformed to
`reader.document` is not possible yet, so use two entities conformed to two
distinct entity schemas once a second conformable entity schema exists), one
`open` intent per entity, and two manual Siri cases, one per entity type, with
a negative case where the phrase names the other type. Until a pilot needs the
second entity type, the fixture stays unbuilt and this paragraph is the
limitation.

## Surface gating decision

Every 27 novelty stays demand-gated. No documented pilot journey requires one
today: the NetNewsWire ledger claims contract, build, Shortcuts, Spotlight and
Siri on three journeys, and none of them needs indexed queries, transfers,
screen annotations, donations, sync, collections, long running work or
execution targets.

Concretely, `discovery.indexed-entity`, `discovery.intent-value-query`,
`discovery.spotlight-lifecycle`, `cross-app.transferable`,
`cross-app.view-annotations`, `relevance.donations`,
`relevance.relevant-entities`, `relevance.syncable-entity`,
`execution.long-running` and `execution.live-activity` remain advisory in the
audit, each one reporting `ILA150` with its group, and none of them is
generated. No separate change is created until a pilot asks for one, and when
that happens the work is split per the order listed in the section above.
