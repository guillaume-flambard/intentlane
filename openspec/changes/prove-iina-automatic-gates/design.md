## Context

Two of the five automatic gates in `PILOT-IINA-DISCOVERY.md` are helper-level only. The obstacle is
structural: `PlayerCore.activeOrNew.openURL` is a static call into a live player, and the Spotlight
index is process-global state, so neither can be asserted from the pure test harness that exists
today.

IINA has no test target, and its contribution guide asks contributors to avoid invasive project
changes, so the proof must be added without restructuring the project.

## Goals / Non-Goals

**Goals:** executable proof for the open path, the index lifecycle and the registration, with no
change to IINA's playback semantics and no assertion that depends on a running window.

**Non-Goals:** Siri or Spotlight surface observation, second-tester reproduction, upstream tests,
performance.

## Decisions

- Introduce a narrow `IINAPlaybackOpening` seam. The open *decision* moves into the pure core as
  `PlayedMediaOpen.perform(identifier:inputs:recordingEnabled:fileExists:player:)`, which is what the
  tests exercise; the adapter supplies IINA's `HistoryController`, `Preference`, `FileManager` and a
  main-actor player that forwards to `PlayerCore.activeOrNew.openURL`. The tested rule is therefore
  the rule that runs in production, not a parallel copy of it.
- Assert the negative cases explicitly: unknown identifier, deleted file, and recording disabled
  must each throw with zero calls to the seam.
- Move the index wrapper into `PlayedMediaIndex.swift`, which imports only AppIntents and
  CoreSpotlight. That is what makes a real index test possible without an Xcode test target, and it
  gives the test a test-specific index name through a defaulted parameter.
- **The SDK cannot be asked what an index contains.** Verified in the macOS 27 headers: App Intents
  exposes `indexAppEntities`, `deleteAppEntities(identifiedBy:ofType:)` and
  `deleteAppEntities(ofType:)`, and `searchableItemsForIdentifiers:searchableItemsHandler:` is a
  `CSSearchableIndexDelegate` callback that the indexer invokes on the app, not a read-back API.
  The original requirement "insertion is observable" is therefore not satisfiable, and is replaced
  by what the framework can actually prove: a real named index accepts the generated entity type,
  accepts the production remove-then-index cycle, and accepts repeated removal. The rule about
  *which* entities belong in the index stays proven by the pure mapping tests.
- Test registration by reading the launch flag, which is now written only when all three registries
  hold an implementation, and by the launch log line reporting each one.
- Keep the pure-core suite: it remains the privacy-rule proof and needs no IINA runtime.

## Risks / Trade-offs

- A seam is production code introduced for testability. It is a small abstraction over one call and
  is justified only while gate 3 is unproven.
- A named test index writes real Spotlight state on the machine; it uses a distinct name and is
  emptied before and after the run.
- Because the index contents cannot be read back, the index test proves the calls, not the outcome.
  Saying otherwise would be exactly the kind of overclaim this change exists to remove.
