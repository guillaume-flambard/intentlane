# macOS Siri entity resolution and opening: public reference

Research date: 2026-09-23. Scope: public source and Apple documentation only;
no product code was changed.

## Conclusion

The documented, supported path is a **resolved entity plus an `OpenIntent`**:

1. Model a stable, displayable record as `AppEntity` (and `IndexedEntity` when
   it is donated to Spotlight).
2. Give it an `EntityQuery`; use `EntityStringQuery` when spoken text must be
   mapped to an entity. `entities(for:)` must recover the exact record by its
   stable ID.
3. Donate approved content with `CSSearchableIndex.indexAppEntities`.
4. Supply an `OpenIntent` whose required property is named `target` and whose
   type is that entity. Its navigation must resolve/open that exact ID.
5. Add `ShowInAppSearchResultsIntent` only for the separate journey “search
   inside the app and show a result list”. It is not a replacement for the
   entity-specific `OpenIntent`.

Apple says `OpenIntent.target` is normally an `AppEntity` and Spotlight can
fill it from an entity found during a search. The system brings the app to the
foreground for that intent. [OpenIntent](https://developer.apple.com/documentation/appintents/openintent)

## Compatibility, verified from Apple’s documentation metadata

The official DocC JSON at
`https://developer.apple.com/tutorials/data/documentation/appintents/<symbol>.json`
reports the following macOS availability. These are protocol-level APIs, not a
claim that every App Schema macro is available on the same OS.

| API | macOS availability | What it establishes |
| --- | --- | --- |
| [`AppEntity`](https://developer.apple.com/documentation/appintents/appentity) | 13.0 | System-facing value representing app content. |
| [`OpenIntent`](https://developer.apple.com/documentation/appintents/openintent) | 13.0 | Opens a specified `target` item. |
| [`EntityStringQuery`](https://developer.apple.com/documentation/appintents/entitystringquery) | 13.0 | Resolves arbitrary text, including a spoken name, into entities. |
| [`ShowInAppSearchResultsIntent`](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent) | 14.2 | Routes a search request to the app’s search UI. |
| [`IndexedEntity`](https://developer.apple.com/documentation/appintents/indexedentity) | 15.0 | Direct App Entity donation to Spotlight. |
| [`URLRepresentableEntity`](https://developer.apple.com/documentation/appintents/urlrepresentableentity) | 15.0 | An optional Universal-Link opening route. |
| [`IndexedEntityQuery`](https://developer.apple.com/documentation/appintents/indexedentityquery) | **27.0** | New direct-donation reindex callbacks. |

The last row is important: do not emit an unguarded `IndexedEntityQuery` into
a macOS 15/26 target. Apple states that, without it, Spotlight continues to
ask the app’s `CSSearchableIndexDelegate` to reindex content associated with
`CSSearchableItem` donation. [IndexedEntityQuery](https://developer.apple.com/documentation/appintents/indexedentityquery)

## Apple’s concrete requirements

* [Entity queries](https://developer.apple.com/documentation/appintents/entity-queries)
  says queries are used during intent parameter resolution and to resolve
  natural spoken language into an app entity. This is the resolution hook, not
  Spotlight indexing alone.
* [Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight)
  directs developers to create an `OpenIntent` for each donated entity type;
  its `OpenLandmarkIntent` declares `var target: LandmarkEntity`. The same
  page says a search-result intent is appropriate when the app has a dedicated
  search view and Spotlight has more than ten results.
* [`ShowInAppSearchResultsIntent`](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent)
  recommends `StringSearchCriteria` and `.general`; it must run from the app,
  not an App Intents extension, and its default mode includes foreground.
* [`URLRepresentableEntity`](https://developer.apple.com/documentation/appintents/urlrepresentableentity)
  is optional. If used, it **requires a Universal Link**; Apple explicitly
  disallows a custom URL scheme. It lets the default `OpenIntent.perform()`
  send the entity URL to the app’s URL handling code. For an app without a
  real Universal Link, retain `OpenIntent` and explicitly navigate from the
  resolved stable ID instead.

## Public GitHub implementations

### Daymark: entity, spoken-string resolver, Spotlight donation, and guarded reindexing

[stinger/Daymark at `d16741f`](https://github.com/stinger/Daymark/tree/d16741f475c7012d4f86de66bb5b8ac960d8a2c3)
is a particularly useful current reference:

* [`CalendarEventEntity.swift` lines 7-35](https://github.com/stinger/Daymark/blob/d16741f475c7012d4f86de66bb5b8ac960d8a2c3/Daymark/AppIntents/CalendarEventEntity.swift#L7-L35)
  declares `IndexedEntity`, stable `id`, `defaultQuery`, indexed properties,
  display metadata, and `CSSearchableItemAttributeSet`.
* [lines 69-124](https://github.com/stinger/Daymark/blob/d16741f475c7012d4f86de66bb5b8ac960d8a2c3/Daymark/AppIntents/CalendarEventEntity.swift#L69-L124)
  implement `EntityStringQuery`, exact-ID resolution, suggestions, and a
  title-matching resolver. The essential design is that an ID query reads the
  backing store and returns only matching IDs.
* [lines 185-198](https://github.com/stinger/Daymark/blob/d16741f475c7012d4f86de66bb5b8ac960d8a2c3/Daymark/AppIntents/CalendarEventEntity.swift#L185-L198)
  conditionally adds `IndexedEntityQuery` and marks it `@available(iOS 27.0,
  *)`. The availability guard is evidence that this reindex protocol must not
  be treated as broadly available.
* [`DemoEventSpotlightIndexer.swift` lines 11-28](https://github.com/stinger/Daymark/blob/d16741f475c7012d4f86de66bb5b8ac960d8a2c3/Daymark/Shared/DemoSchedule/DemoEventSpotlightIndexer.swift#L11-L28)
  is the direct `indexAppEntities` / delete lifecycle.

### AppIntents demo: the minimum entity-specific open intent

[hespinola/AppIntents at `2afc1e0`](https://github.com/hespinola/AppIntents/tree/2afc1e0281efafafb8c9538d015d28956be8f9aa)
shows the compact counterpart:

* [`OpenListingIntent.swift` lines 10-22](https://github.com/hespinola/AppIntents/blob/2afc1e0281efafafb8c9538d015d28956be8f9aa/AppIntentsDemo/Intents/OpenListingIntent.swift#L10-L22)
  adopts `OpenIntent`, declares `@Parameter var target: Listing`, and runs in
  the foreground.
* [`Listing.swift` lines 10-38](https://github.com/hespinola/AppIntents/blob/2afc1e0281efafafb8c9538d015d28956be8f9aa/AppIntentsDemo/Models/Listing.swift#L10-L38)
  makes the target an `AppEntity` with `defaultQuery`, display representation,
  exact-ID lookup and suggestions.

These are implementation patterns, not compatibility authorities. Apple’s
availability metadata above is authoritative.

## Unsupported assumptions to remove

* “Indexing by itself makes Siri open the exact record.” No: indexing makes
  content discoverable; entity resolution and an `OpenIntent` supply the
  exact-item handoff.
* “`ShowInAppSearchResultsIntent` opens a particular item.” No: it accepts
  search criteria and displays an in-app result set. Pair it with `OpenIntent`
  for selection/opening.
* “`URLRepresentableEntity` works with `myapp://`.” No: Apple requires
  Universal Links.
* “`IndexedEntityQuery` is safe on every macOS with `IndexedEntity`.” No:
  current Apple metadata lists macOS 27.0. Gate it or use the compatible
  reindex route for earlier deployment targets.
* “An entity query can return a near match when the stable ID is missing.” No:
  returning a different record risks opening the wrong user content. Return no
  entity for an unknown identifier.
