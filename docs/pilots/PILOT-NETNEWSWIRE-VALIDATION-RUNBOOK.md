# NetNewsWire pilot validation runbook

Date: 2026-09-23

## Current, measured state

The macOS 27 App Intents integration plan passes 22 of 22 tests on the local Mac.

Core journeys (8):

- exact resolution of Alpha;
- Alpha as an `IndexedEntity` Spotlight result;
- direct `OpenIntent` navigation to Alpha in the NetNewsWire interface;
- `MarkArticleRead` applied to Beta;
- `MarkArticleUnread` applied to Beta after a read transition;
- `StarArticle` and `UnstarArticle` applied to Beta;
- a pilot RSS feed resolves separately and opens its exact sidebar item;
- an invented title returns no entity and never resolves to Gamma.

Extended training actions (14, all contract-tested out of process, none exposed
in Shortcuts):

- a folder entity resolves by name and opens its exact sidebar item;
- create a local folder with empty-name rejection and duplicate-name collision;
- delete an empty local folder; a non-empty folder is refused;
- refresh the pilot feed through its local-only fixture server;
- mark every article of the pilot feed as read, counted;
- move the pilot feed into a folder, with an already-in-destination refusal;
- add a local-only feed after a localhost whitelist check (external URLs refused);
- unsubscribe a local feed with device authentication, unknown targets refused.

The authoritative result bundle is the `.xcresult` for the `Test-NetNewsWire`
scheme inside Xcode's DerivedData, at the path `xcodebuild` prints with
`-resultBundlePath`. **The absolute path is not written here on purpose**: it
carries the account name of whoever ran it, and this file is in a public
repository. Use `-resultBundlePath` and name the bundle yourself:

```sh
xcodebuild test \
  -resultBundlePath "$(mktemp -d)/Test-NetNewsWire.xcresult" \
  ...
```

It records macOS 27.0, build 26A428, 22 passed tests and 0 failed tests
(totalTestCount 22, result "Passed"). The App Intents testing harness does not
block the destructive intents' `authenticationPolicy = .requiresLocalDeviceAuthentication`:
the unsubscribe and delete-folder positive paths ran green.

The remaining gates are deliberately not claimed as passed: a person must see
the visible Spotlight result and perform the two spoken Siri conversations;
then a second person must reproduce them for the strict evidence ledger.

## Reproducible command

Run this command from any checkout with the pilot target configured:

```sh
rtk xcodebuild -project /tmp/il-pilot/fork/NetNewsWire.xcodeproj \
  -scheme NetNewsWire \
  -testPlan NetNewsWire-AppIntents \
  -destination 'platform=macOS,arch=arm64' test
```

The test target intentionally discovers the app only by its public bundle
identifier. It does not import NetNewsWire implementation code. This tests the
same out-of-process App Intents surface used by system experiences.

## Fixes that mattered

1. Use the primary system schemas `.system.searchInApp` and `.system.open`.
   The earlier Reader schemas are a separate Shortcuts-only surface.
2. Model every feed article as an `IndexedEntity` and give its human title an
   explicit `@ComputedProperty(indexingKey: \.displayName)`. This is the form
   used by Apple's system-experience sample.
3. Donate entities through `CSSearchableIndex.indexAppEntities(_)` and replace
   stale pilot entries before donating the current fixture set. The pilot's
   default-index implementation is covered by its integration test. Before a
   production submission, move this to the app's named index as described by
   Apple's Spotlight guide, and repeat the visible acceptance test.
4. Keep entity resolution self-contained in `EntityQuery`; do not rely on a
   runtime dependency container when the system invokes the intent.
5. Have `OpenArticle.perform()` call the app's navigation adapter directly.
   A universal-link handoff is a separate web-routing concern and is not the
   mechanism that proves the intent opens an in-app item.
6. Expose exactly two pilot shortcuts: `Open an article` and `Mark an article
   as read`, each with its Article parameter. The previous diagnostic shortcut
   was removed.
7. Use `@ComputedProperty`, not a stored macro property, for derived entity
   state such as `isRead`. Stored macro properties caused Swift initialization
   errors.
8. Set the App Intents test target deployment target to macOS 27 and use an
   async XCTest setup hook. The final run has zero build warnings.
9. Keep the two system journeys distinct. `SearchInApp` owns a search screen;
   `OpenIntent` owns a selected entity and navigates to its exact stable ID.
   The entity now supplies title, feed subtitle and an article image when one
   exists, with a document-image fallback. Siri owns the card layout and the
   selection UI, not NetNewsWire.
10. Status mutations use the application-owned `ArticleStatus.Key` and exact
    stable article ID. The core shortcut profile remains limited to the two
    advertised actions; the extra status intents are contract-tested training
    actions until their own user-facing surface is separately approved.
11. A feed is its own entity type. Its ID is scoped to the account and is
    opened by sidebar selection, never by treating a feed title as an article
    title.

## Investigated and rejected as causes

- VPN, hotspot, Spotlight index rebuild, notarization and Developer ID signing
  are not fixes for the entity contract. They were not retained as product
  requirements.
- A terminal query that cannot inspect App Intents donations is not treated as
  evidence that Spotlight failed.
- A direct universal-link opening of Alpha is useful navigation evidence but
  does not prove conversational Siri execution.

## Manual acceptance protocol

Use the exact installed pilot copy and record OS build and locale beside each
observation.

1. Open the pilot feed and confirm Alpha, Beta and Gamma are present.
2. In Shortcuts, search NetNewsWire. Confirm only the two pilot actions and
   their Article parameter.
3. In Spotlight, search `Alpha article about feed readers`. Confirm the result
   is NetNewsWire, then open it and confirm Alpha is selected.
4. Ask Siri: `Open an article in NetNewsWire`; select Alpha when prompted;
   confirm Alpha opens. Do not use a free-text search request for this check:
   that deliberately exercises `SearchInApp` and only lands on the in-app
   result list.
5. Ask Siri: `Mark an article as read in NetNewsWire`; select Beta; confirm
   Beta is read.
6. Ask for an invented title; confirm it does not open an article and does not
   select Gamma.
7. A second reviewer repeats steps 1 to 6 on a separate session before the
   ledger may be described as verified.

## Sources

- [Apple: Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight)
- [Apple: Adopting App Intents to support system experiences](https://developer.apple.com/documentation/appintents/adopting-app-intents-to-support-system-experiences)
- [WWDC26: Test your App Intents](https://developer.apple.com/videos/play/wwdc2026/295/)
