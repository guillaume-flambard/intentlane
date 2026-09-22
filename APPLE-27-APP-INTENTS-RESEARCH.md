# IntentLane: App Intents inventory for the 27 platform releases

Research date: 22 September 2026. This is a source-of-truth inventory for a
future IntentLane audit and implementation service, not a claim that every
capability is supported today. It uses Apple Developer documentation and WWDC26
sessions only. Apple calls these the "27 releases" in its current guidance.

## Executive conclusion

An `AppIntent` by itself makes an action available to system surfaces such as
Shortcuts, Spotlight, and widgets. It does **not** make Siri or Apple
Intelligence understand the action's business meaning in natural language. For
that, an app needs the relevant **App Schema** conformance, the complete
supporting entity model required by that schema, and an implementation that can
actually execute safely. Apple is explicit that schemas are the way actions and
content become discoverable to Apple Intelligence and Siri.

This creates a viable service boundary: audit an existing app for its eligible
schemas and prerequisites, implement a small number of high-value end-to-end
journeys, and validate them with Apple's test framework plus real-system tests.
Do not sell universal Siri control or a guaranteed language outcome.

Primary sources: [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains), [Build intelligent Siri experiences with App Schemas, WWDC26](https://developer.apple.com/videos/play/wwdc2026/240/), [Explore advanced App Intents features, WWDC26](https://developer.apple.com/videos/play/wwdc2026/343/), and [Discover new capabilities, WWDC26](https://developer.apple.com/videos/play/wwdc2026/345/).

## Apple capability inventory

| Capability | What it enables | Audit evidence / implementation requirement | IntentLane 0.1 |
| --- | --- | --- | --- |
| `AppIntent` | An executable app action with typed parameters and a result. It can surface in Shortcuts, Spotlight, widgets, and other system experiences. | Intent declaration, `perform()`, correct result traits, metadata extracted from the built product. | **Generates and validates**, for `open_app` and registered `native` handlers. |
| Specialised intent/value contracts | Apple also provides specialised contracts such as open, delete and in-app-search intents; media and URL-representable values let system features handle conventional content shapes. | Audit whether the app has been modelled as a generic custom intent where a system contract is a better semantic fit. | **Not generated/audited** beyond its own `open_app` result. |
| `AppShortcutsProvider` | Curated App Shortcuts and invocation phrases, available after installation. | Provider, phrases with the required app-name placeholder, localised titles, device validation. | **Generates** registered shortcuts and phrases. |
| `AppEntity`, `AppEnum`, queries | A structured representation of app data and choices; lets the system resolve intent parameters. `AppEntity` needs identity, display representation, exposed properties and a query. | Model-to-entity mapping, `@Property` metadata, `EntityQuery`/specialised query behavior, real resolver coverage. Entity instances have a 10 MB total limit. | **Generates basic entities**, `AppEnum`, and an identifier/suggested `EntityQuery`; resolver remains application-owned. |
| App Schemas and domains | Standard contracts that allow Apple Intelligence and Siri to reason about content and actions, rather than treating them as custom actions. Apply with `@AppIntent(schema:)`, `@AppEntity(schema:)`, or `@AppEnum(schema:)`. | Domain fit, all required companion entities/enums/parameters/results and exact schema conformance. Test against the target SDK, since schemas can evolve. | **Partial**: knows 254 public references but can generate only 3 intent and 20 entity conformances; no enum conformance or schema-completeness audit. |
| Primary Siri/Apple Intelligence domains | Audio, Calendar, Reminders, and System/in-app search are primary schema domains. The broad `.system.search` and `.system.open` fit many content apps. Other documented Siri domains include Camera, Clock, Files, Mail, Maps, Messages, Notes, Phone, and Photos. | Match the app's real domain and existing core nouns/actions, then implement the required domain contract rather than merely assigning a schema name. | **Only camera stop/switch and audio create-station are generatable intent schemas.** |
| Shortcuts-only schemas | Books, Browser, Files, Journaling, Presentation, Reader, Spreadsheet, Whiteboard, and Word Processor schemas are documented as Shortcuts-specific and do **not** make conforming types discoverable by Apple Intelligence and Siri. | Market and scope them as Shortcuts automation, not Siri/Apple Intelligence coverage. | Reference knowledge only; no broad implementation. |
| `IndexedEntity` and Spotlight | Makes an entity indexable in the app's Spotlight index. Apple describes it as a prerequisite for making an entity available in Spotlight; it also helps discovery and some Siri use cases. | Privacy review, indexing-key mapping, donation/update/delete lifecycle, Spotlight search verification. | **Not generated or audited.** The current docs explicitly caution against indexing private values without opt-in. |
| Entity variants and ownership | `UniqueAppEntity`, `FileEntity`, transient and URL-representable entities cover singleton settings, files, temporary concepts and navigable content. `OwnershipProvidingEntity`/`EntityOwnership` conveys personal versus shared/public context; sharing can require confirmation for sensitive or destructive work. | Entity-kind fit, universal-link/file behavior, ownership and confirmation test cases. | **Not supported/audited.** |
| `IntentValueQuery` | Structured lookup of intent values, including resolving values supplied from another app. | Query semantics, privacy, error/ambiguity handling, real corpus tests. | **Not generated/audited.** Current static `EntityQuery` is not equivalent. |
| `Transferable` + `IntentValueRepresentation` | Transfers compatible content or entities between apps. Apple demonstrates an entity conforming to `Transferable` and exporting/importing an intent value representation. | Explicit export/import model, data minimisation, source/destination error cases, end-to-end handoff test. | **Not supported.** |
| View annotations / onscreen awareness | Associates the entity currently represented by a SwiftUI, UIKit, or AppKit view with its UI element so Apple Intelligence/Siri can interpret current visible context. | Entity-to-view annotations, view lifecycle behavior, accessibility/UI evidence, tests of the annotation provider. | **Not supported or audited.** |
| Donations and `RelevantEntities` | Donated interactions help the system learn preferences and ongoing state. `RelevantEntities` registers timely, relevant content so Siri can choose meaningful objects. | Event selection, expiry/revocation, consent/privacy, meaningful relevance criteria, no spam donation. | **Not supported/audited.** |
| `EntityCollection` | Efficiently passes/manages collections of entities, introduced for the 27 releases. | Collection boundaries, large-data performance, Shortcuts behavior and cancellation tests. | **Not supported.** |
| `SyncableEntity` | Signals that an entity has an ID consistent across devices, allowing the system to refer to it across devices; if local and stable IDs differ use `SyncableEntityIdentifier`. | Stable-ID source, account/sync semantics, cross-device test matrix. | **Not supported.** |
| Rich parameter types and `@UnionValue` | The 27 releases add richer native parameter support and union values, where one parameter can accept one of several named types. | Lossless mapping to Swift types, resolution and disambiguation tests, supported OS guard. | **Basic scalar, enum and entity parameters only**; no collections, files/media, rich native types, or union values. |
| `LongRunningIntent` and cancellation | Lets an intent continue for longer work and respond gracefully to cancellation. | Idempotency, progress/cancellation behavior, background/lifecycle constraints, safety rollback. | **Not supported.** |
| Execution targets and modes | Lets an intent choose its execution process (`main`, App Intents extension, WidgetKit extension) and foreground/background support. | Correct process selection, UI access, data isolation and failure behavior. | **Not supported.** Current `native` handler registry is not execution-target selection. |
| Confirmation, authentication, ownership | `requestConfirmation` and `authenticationPolicy` guard destructive or protected operations. Ownership/sharing entity context lets the system distinguish personal/shared data. | Per-action risk classification, confirmation copy, auth policy, ownership/sharing state and security tests. | **Partial**: supports confirmation plus required/none/inherited authentication policy. No ownership/sharing audit. |
| Visual results | `ProvidesDialog`, `ShowsSnippetView`, `ReturnsValue`, and `OpensIntent` make outcomes speakable, visible, composable, and navigable. | Result semantics, SwiftUI snippet, output value, localization and failure messages. | **Partial**: open-app emits dialog/snippet/open; native supports dialog and optional returned entity. |
| `AppIntentsTesting` | Apple's new framework tests intents, result values, queries, chained intents, Spotlight indexing, and view annotations using the same underlying infrastructure as Siri, Shortcuts, and Spotlight, without UI automation. | XCTest target that asserts each supported journey and its negative/risk cases; retain separate real Siri verification. | **Not integrated.** Existing checks compile Swift and inspect extracted metadata, which proves packaging but not runtime behavior. |

Sources for the table: [AppEntity](https://developer.apple.com/documentation/appintents/appentity), [App entities](https://developer.apple.com/documentation/appintents/app-entities), [SyncableEntity](https://developer.apple.com/documentation/appintents/syncableentity), [UnionValue](https://developer.apple.com/documentation/appintents/unionvalue()), [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains), [System and in-app search](https://developer.apple.com/documentation/appintents/app-schema-domain-system-and-in-app-search), [AppIntentsTesting, WWDC26](https://developer.apple.com/videos/play/wwdc2026/295/), and [App Intents 27-release capabilities, WWDC26](https://developer.apple.com/videos/play/wwdc2026/345/).

## Platform and availability discipline

Apple's public pages establish the capability model but do not support a blanket
claim that every schema or capability is available on both macOS and iOS 27.
Each audit must read the symbol availability in the installed target SDK and
compile against the customer's actual deployment target. The repository only
stores `min_ios`, not a macOS deployment floor, so it cannot truthfully audit
macOS availability today.

Two documented distinctions matter immediately:

1. The Assistant domain's side-button `activate` schema is for iPhone and only
   in Japan, so it is not a macOS Siri-control feature.
2. Apple's schema catalogue marks the document-oriented domains listed above as
   Shortcuts-only. They must not be sold as making an app discoverable by Apple
   Intelligence and Siri.
3. `RunSystemShortcutIntent` is iOS 27-only, not a macOS capability. For
   long-running background work, Apple's current API documentation distinguishes
   macOS, where background tasks have no time limit, from iOS/iPadOS and similar
   platforms, which normally have a 30-second limit unless using
   `LongRunningIntent`.

The current macOS 27 release notes also record an Audio-domain Siri issue and
say to use an `IntentValueQuery` taking `AudioSearch` or index entities in
Spotlight as the workaround. They also note a schema default-value issue for
`Set` parameters. These are mandatory audit checks, not footnotes.

Sources: [Assistant schema domain](https://developer.apple.com/documentation/appintents/app-schema-domain-assistant), [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains), and [macOS 27 release notes](https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes).

The local Xcode 27 SDK used by this repository declares the 27-release APIs
with `anyAppleOS 27.0`; its schema foundation is available earlier (macOS 15 /
iOS 18), and `IntentValueRepresentation` begins at 26.4. Apple still marks
some current pages as beta/preliminary, so this inventory must be rechecked
against final SDKs before marketing an implementation guarantee. See [App
Intents updates](https://developer.apple.com/documentation/Updates/AppIntents),
[LongRunningIntent](https://developer.apple.com/documentation/appintents/longrunningintent),
and [Intent execution targets](https://developer.apple.com/documentation/appintents/intentexecutiontargets).

## Read-only comparison with IntentLane

### What is already credible

The repository's generated Swift covers the useful foundation: generic
`AppIntent`, App Shortcuts, localised scalar/enum/entity parameters, static
entity queries, open-app routes, native handlers, returned entities,
confirmation/authentication, SwiftUI snippets, and limited schema macros. It
has both an Expo example and a macOS example. The macOS verifier compiles
generated Swift with the macOS SDK and checks metadata extracted by
`appintentsmetadataprocessor`; the iOS example builds a simulator app and
asserts built metadata. That is strong proof of code generation and product
packaging, but not proof of an action working in a third-party app, in Siri, or
with Apple Intelligence's language understanding.

The source of this comparison is the current repository: `SPEC.md`,
`ROADMAP.md`, `README.md`, `packages/core/src/app-schemas.ts`, and
`packages/generator-apple/src/index.ts`.

### What cannot yet be implemented or audited

IntentLane cannot yet generate or audit the majority of the 27-release value:

- schema-complete implementations beyond three no-parameter intent schemas;
- `AppEnum(schema:)`, required schema parameter/result/companion-type shapes,
  and an exhaustive macOS availability matrix;
- Spotlight indexing, semantic search, `IntentValueQuery`, `Transferable`,
  `IntentValueRepresentation`, UI annotations, donations, relevance,
  collections, stable cross-device identity, union/rich value parameters,
  long-running/cancellable work, execution targets, ownership/sharing;
- Apple `AppIntentsTesting`, device/system tests, real Siri phrase tests, or a
  scan of an existing repository to produce a capability-gap audit.

It also deliberately rejects endpoint/entity networking and HTTP execution;
that is a sensible security boundary but means service engagements need native
customer-owned adapters for data and action execution.

## Recommended phased service roadmap

### Phase A: make the audit honest

Build a read-only analyser before expanding every generator feature. It should
produce a per-target report: deployment targets, App Intents already present,
schemas and required dependencies, entities/queries, shortcuts, risk policy,
privacy/indexing status, and unimplemented capabilities. Add both `min_ios`
and `min_macos`, and source the schema/availability catalogue from the installed
Xcode SDK rather than a hand-maintained list alone. Distinguish: available,
implemented, tested, and verifiably working.

### Phase B: prove one broad, sellable path

Prioritise `.system.search` and `.system.open` for a public macOS content app.
They are broad enough for realistic repos and are expressly intended for apps
that search/open content. Add schema-complete entity support, `IndexedEntity`,
and `IntentValueQuery` where it is required. Build a pilot that exercises three
journeys: find content, open a named item, and act on that item. Validate in
`AppIntentsTesting`, Spotlight, Shortcuts, and finally a real Siri interaction
on macOS 27. Record exact OS/Xcode/build conditions.

### Phase C: domain packages, not universal claims

Add one complete domain at a time, starting with the customer's actual market
(for example Notes, Calendar, Reminders, Mail, Messages, Photos, or Audio).
Each package needs the full required entity/enums/intents/result graph plus
negative and destructive-operation tests. Treat document-app domains as a
separate Shortcuts automation package unless Apple changes their discovery
classification.

### Phase D: advanced 27 capabilities

Add transfer, relevant entities/donations, onscreen awareness, collections,
syncable identities, unions, long-running/cancellation, execution targets and
ownership in that order only when a pilot has a concrete use case. Add these to
the audit as advisory checks before generating them.

### Phase E: commercial proof and packaging

Sell a fixed-scope **Siri and Apple Intelligence compatibility audit** first:
one repository, target matrix, feasible schema map, three recommended user
journeys, gap report, and priced implementation plan. The implementation offer
then covers one domain and two or three end-to-end actions, with acceptance
evidence from Apple tests, a built app, Shortcuts/Spotlight, and manual Siri
tests. The claim should be: *"We make the actions and content Apple has
standardised for your app category discoverable and executable through Siri,
Apple Intelligence, and system surfaces where the OS supports them."* It should
not promise that every arbitrary request or every app receives full Siri
control.

## Acceptance bar before public marketing

1. A published macOS 27 and iOS 27 matrix states exact supported capabilities
   and non-support.
2. A public, reproducible pilot exists for each platform with a real existing
   app or an externally reviewed open-source app.
3. Each advertised journey passes `AppIntentsTesting`, metadata/build checks,
   and a documented real-device/system test.
4. The audit catches both missing schema contracts and false claims, including
   Shortcuts-only domains and platform availability.
5. Marketing names the supported domain and journeys, rather than asserting
   generic Siri control.
