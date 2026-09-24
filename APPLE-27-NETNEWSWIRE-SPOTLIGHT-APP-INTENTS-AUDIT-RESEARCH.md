# NetNewsWire Spotlight and App Intents audit (Apple 27 SDK)

Research date: 23 September 2026. Scope: read-only comparison of the pilot in
`/tmp/il-pilot/fork` with current Apple Developer documentation and Xcode 27.0
(27A266a)'s macOS SDK. No source, entitlement, or Spotlight-index changes were
made.

## Finding

The earlier conclusion that the pilot is blocked by an undocumented Spotlight
entitlement is **not supported by Apple’s public documentation or the installed
SDK**. The audit instead finds concrete implementation gaps, including one
unsupported navigation mechanism. The first correction to validate is the
documented URL/open route and the content-index lifecycle, not a Spotlight reset
or a guessed entitlement.

## The current Apple model, separated by responsibility

| Desired journey | Owning API | Current documented requirement |
| --- | --- | --- |
| Find an article in Spotlight, then open it | **Core Spotlight + App Intents** | Give the article a stable `AppEntity`/`IndexedEntity`, map approved searchable properties, donate it to a **named** `CSSearchableIndex`, and supply an `OpenIntent` for the entity. Direct entity donation is a supported alternative to manually building `CSSearchableItem`s. [Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight), [indexAppEntities](https://developer.apple.com/documentation/corespotlight/cssearchableindex/indexappentities%28_%3Apriority%3A%29) |
| Open a selected article with Siri or Spotlight | **App Intents** | Use `OpenIntent` with an `AppEntity` target. The macOS 27 schema spelling is `@AppIntent(schema: .system.open)`. [OpenIntent](https://developer.apple.com/documentation/appintents/openintent), [system/open](https://developer.apple.com/documentation/appintents/appschema/systemintent/open) |
| Continue a *Spotlight text query* in the app | **Classic Core Spotlight**, distinct from the App Schema | Declare `CoreSpotlightContinuation = YES` and handle `CSQueryContinuationActionType` / `CSSearchQueryString` in the app activity lifecycle. This is optional for article-result selection; it is not what `.system.searchInApp` implements. Xcode SDK: `CoreSpotlight.framework/.../CSSearchableItem.h:25-35`; [Core Spotlight indexing](https://developer.apple.com/documentation/corespotlight/adding-your-app-s-content-to-spotlight-indexes) |
| Ask Siri to search inside the app | **App Intents + system schema** | `.system.searchInApp`, which is new in 27 and replaces deprecated `.system.search`; it models in-app search for Siri/Apple Intelligence. [System and in-app search](https://developer.apple.com/documentation/appintents/app-schema-domain-system-and-in-app-search) |
| Mark an RSS article read | **Custom App Intent** | There is no public news/article read-state schema. The Messages read-status schema is not reusable; Reader/Books schemas are Shortcuts-only and do not make actions discoverable to Apple Intelligence and Siri. Implement an app-owned typed action if this journey is wanted. [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains), [Reader](https://developer.apple.com/documentation/appintents/app-schema-domain-reader) |
| Curated spoken phrase / Shortcut tile for mark-read | **App Shortcuts** | Add `AppShortcutsProvider` only for a curated shortcut. It supplies phrases and presentation, but does not index articles. App Shortcuts are not supported on macOS according to Apple’s HIG, so do not make them a macOS acceptance dependency. [App Shortcuts](https://developer.apple.com/documentation/appintents/app-shortcuts), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts) |

### Important distinction: direct entities versus classic items

The pilot’s `indexAppEntities` approach is current and valid. `IndexedEntity`
plus a named index lets Spotlight build attributes from the entity and use an
`OpenIntent` for a selected result. A legacy `CSSearchableItem` path is also
valid, but it needs the `NSUserActivity` selection handler documented in the
SDK. Do **not** directly donate an entity *and* index a separate
`CSSearchableItem` for the same article: Apple says that creates separate
entries. Existing manual items may instead call `associateAppEntity`.
[Apple’s direct-donation guidance](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight), [duplicate-entry behavior](https://developer.apple.com/documentation/corespotlight/cssearchableindex/indexappentities%28_%3Apriority%3A%29).

## Pilot comparison

| Requirement | Pilot evidence | Assessment |
| --- | --- | --- |
| Stable entity and named direct donation | `IntentLaneArticleEntity: AppEntity, IndexedEntity`; `CSSearchableIndex(name: ...)` | Correct direction. The title uses `@ComputedProperty(indexingKey: \\.title)`, which is the documented way to opt a property into Spotlight indexing. |
| System 27 search/open schemas | `@AppIntent(schema: .system.searchInApp)` and `.system.open` | Correct 27 spelling. The SDK’s macro declaration explicitly adds `ShowInAppSearchResultsIntent` and `OpenIntent`; with `StringSearchCriteria`, the SDK supplies default search scopes. This is not a missing-protocol defect. |
| URL open route | `URLRepresentableEntity` returns `netnewswire://intentlane/article/...` | **Unsupported.** Apple explicitly requires a Universal Link for `URLRepresentableEntity`/`URLRepresentableIntent`, not a custom URL scheme. The custom scheme is registered and handled by the pilot, but that does not meet the contract. [URLRepresentableEntity](https://developer.apple.com/documentation/appintents/urlrepresentableentity), [URLRepresentableIntent](https://developer.apple.com/documentation/appintents/urlrepresentableintent) |
| Full content lifecycle | At launch it indexes only the three fixture titles; `suggestedEntities()` is also used by `reindexAllEntities` | **Incomplete.** Apple requires current indexes: add/update after data changes, delete unavailable content, and a true full reindex. The implementation is neither a production corpus nor a full reindex. [Core Spotlight lifecycle](https://developer.apple.com/documentation/corespotlight/adding-your-app-s-content-to-spotlight-indexes) |
| Reindex support for direct donation | `IndexedEntityQuery` present | Structurally correct, but `reindexAllEntities` incorrectly returns only the three fixture records. Apple specifically requires this protocol with `indexAppEntities` donation, with subset and all-content refetches. [IndexedEntityQuery](https://developer.apple.com/documentation/appintents/indexedentityquery) |
| Article metadata | Indexed title only; `feedName` is only display subtitle | Minimal title lookup can work. Product must approve which additional content is searchable (feed, author, summary, body) and map each to an appropriate Core Spotlight key. Do not add private/full text by default. |
| Mark read | No `MarkArticleReadIntent`, no article mutation adapter | **Missing.** The existing AppKit `markRead` action is not an App Intent. |
| App Shortcut | Existing iOS Add Feed shortcut; pilot deliberately has none | Fine for Spotlight entity search. A separate product decision is needed if a Mac-independent Siri phrase/Shortcut experience for mark-read is wanted. |
| Deployment | Project’s ordinary `MACOSX_DEPLOYMENT_TARGET` is 15.0; the signed pilot Info.plist says 27.0 | **Unclear/non-repeatable.** `.system.searchInApp`, `.system.open`, and `IndexedEntityQuery` are `anyAppleOS 27.0` in the installed SDK. Production must either raise the macOS minimum to 27 or isolate the 27 implementation behind availability/target-specific compilation. |
| Entitlements | No public indexing entitlement is named by the relevant Apple docs or SDK. The SDK’s only Core Spotlight entitlement reference is Mail-query-specific. The examined signed debug bundle has sandbox set to `false`. | No verified entitlement change follows. The reported “process not properly entitled” log must be reproduced after the documented code path is corrected; it does not identify a public entitlement to add. |

## Smallest verified plan (no implementation performed)

1. Choose the open route:
   - Preferred if NetNewsWire has a real public article URL: use a Universal Link,
     associated-domain entitlement, AASA hosting, and URL handling, then keep
     `URLRepresentableEntity`.
   - Otherwise remove `URLRepresentableEntity` and implement the `OpenIntent`
     route directly so it resolves the stable ID and invokes NetNewsWire’s
     existing AppKit article router. This avoids falsely claiming a Universal
     Link.
2. Make the direct-entity index real: index the approved article corpus on
   committed refresh/update, delete by exact ID on removal, and make
   `reindexAllEntities` fetch that whole approved corpus. Serialize access to
   the named index; batch large updates. Do not reset the system index first.
3. Add `MarkArticleReadIntent` as a custom `AppIntent` with an article
   parameter, a stable-ID resolver, explicit current `supportedModes`, and an
   idempotent app-owned mutation. It has no valid RSS read-state schema, so do
   not borrow Messages/Mail schemas. Add an `AppShortcutsProvider` only if a
   curated Siri/Shortcuts action is a supported platform target.
4. Decide separately whether the product needs classic Spotlight query
   continuation. If yes, add the plist key and `NSUserActivity` continuation
   handling. It is not required merely for a result that opens an article.
5. Build the normal project configuration at its supported deployment target,
   verify the extracted App Intents metadata, then test a fresh fixture index.
   Treat an entitlement error at that point as a new diagnostic fact, not as
   proof of an entitlement name.

## Local operational sources

- Xcode 27.0 (27A266a), macOS SDK:
  `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk`.
- `AppIntents.swiftinterface:13783-96` establishes 27-only
  `.system.searchInApp` and `.system.open`; `:10944` shows the schema macro’s
  generated protocol conformances; `:4251-54` establishes the 27-only
  `IndexedEntityQuery` reindexing contract.
- `CoreSpotlight.framework/.../CSSearchableItem.h:14-35` documents item
  selection and query continuation; `CSSearchableIndex.h:107-` documents
  delegate/extension reindexing for legacy items.
