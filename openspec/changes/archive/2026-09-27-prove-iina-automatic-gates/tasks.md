## 1. Open path (gate 3)

- [x] 1.1 Add the `IINAPlaybackOpening` seam and move the open decision into
      `PlayedMediaOpen.perform`, with the production player forwarding to
      `PlayerCore.activeOrNew.openURL` on the main actor.
- [x] 1.2 Test: a valid resolved record calls the seam exactly once with that record's URL.
- [x] 1.3 Test: an unknown identifier performs zero calls and throws.
- [x] 1.4 Test: a resolved record whose file no longer exists performs zero calls and throws.
- [x] 1.5 Test: recording disabled performs zero calls and throws.
- [x] 1.6 The production player is `@MainActor`; the runtime probe confirms the app launches with
      it wired, and no call can escape the main actor through the adapter.

## 2. Index lifecycle (gate 4)

- [x] 2.1 Move the index wrapper to `PlayedMediaIndex.swift`, free of any IINA dependency, with a
      defaulted index name so tests can target their own index.
- [x] 2.2 Test against a real named `CSSearchableIndex`, using a test-specific index name.
- [x] 2.3 Test: the generated entity type is accepted by a real named index.
- [x] 2.4 Test: removing every entity of the type succeeds, and succeeds again on an empty index.
- [x] 2.5 Test: a full remove-then-index refresh cycle succeeds.
- [x] 2.6 Empty the test index before and after the run.
- [x] 2.7 Replaced, with the reason recorded: "insertion is observable". App Intents and Core
      Spotlight expose no read-back of a named index, so the contents rule is proven by the pure
      mapping tests and the index test proves the calls. The `CSSearchableIndexDelegate`
      `searchableItemsForIdentifiers:` method is an indexer callback, not a read API.

## 3. Registration

- [x] 3.1 Write the launch flag only when the entity resolver and both intent handlers are non-nil.
- [x] 3.2 Log each registry's state at launch.
- [x] 3.3 Runtime probe: the flag reads `1` and the launch log reports
      `resolver true, open true, search true`, followed by the first index refresh.

## 4. Gate honesty

- [x] 4.1 Add `run-all-tests.sh` as the single `--app-test` command, running both suites.
- [x] 4.2 Re-run `intentlane verify` with it: `contract`, `generated`, `applicationTests` and
      `metadata` pass, `liveEvidence` still not requested.
- [x] 4.3 State in the pilot documentation what the gate now covers and what it still does not:
      the Siri and Spotlight surfaces stay outside every automated gate, and registration is proven
      by a runtime probe rather than by the test command.
