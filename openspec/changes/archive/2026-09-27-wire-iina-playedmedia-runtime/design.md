## Context

The adapter exists and builds, but IntentLane's generated code is inert by design until the
application registers its implementations: `IntentLaneEntityResolvers.<entity>` starts `nil` and
`IntentLaneIntentHandlers.<id>` starts `nil`. The generated query returns an empty list and
`perform()` throws. This is IntentLane's deliberate model (the client owns mapping, access and
navigation), so the wiring must live in the application, not in the generator.

IINA's history is an event source: `HistoryController` posts `iinaHistoryUpdated` on every save
and `iinaHistoryTaskFinished` when the background queue drains, and the user can switch
`recordPlaybackHistory` at any time. Both are the only legitimate triggers for indexing.

## Goals / Non-Goals

**Goals:** make the pilot functional at runtime, keep the index faithful to the opt-in, and make
the registration observable so a green build can no longer hide an inert adapter.

**Non-Goals:** proving the Siri or Spotlight surface, changing IINA's history model, upstream
changes, publishing the app, any contact with the IINA team.

## Decisions

- Register in `AppDelegate` at launch inside `if #available(macOS 27.0, *)`, because the adapter
  types are `@available(macOS 27.0, *)` and IINA's deployment floor is lower.
- Drive the index from `iinaHistoryUpdated`, from `iinaHistoryTaskFinished` when the background
  queue drains, and from a preference-change observation, not from a timer or from launch alone, so
  the index never claims history the user disabled.
- Reconcile by rewriting the index, not by subtracting a remembered set. The App Intents Core
  Spotlight surface in the macOS 27 SDK offers exactly three operations, verified in
  `AppIntents.swiftinterface`: `indexAppEntities`, `deleteAppEntities(identifiedBy:ofType:)` and
  `deleteAppEntities(ofType:)`. There is no read-back, so a refresh removes the type and re-indexes
  the current history. The index then cannot hold anything the current openable history does not
  say it should, which is stronger than any bookkeeping, and it removes the drift the review found.
- Keep no persisted index state at all. The old `UserDefaults` identifier list was deleted.
- Extract one shared mapping, `PlayedMediaCore.records(from:fileExists:)` behind
  `IntentLanePlayedMediaHistory`, so the privacy rule (stored title or basename, no path, existing
  file only) is written once and cannot diverge between resolution, opening and indexing.
- Observe the preference through a retained `NSObject` KVO observer rather than IINA's
  `observedPrefKeys`, because that list is IINA's logging hook and the pilot must not couple to it.
- Record registration state in `UserDefaults` so a probe can assert it; the gate must observe, not
  assume.

## Risks / Trade-offs

- IINA's `AppDelegate` is a large, UI-heavy file: touching it increases diff noise and, per IINA's
  contribution guide, any UI-adjacent change eventually needs a design proposal before a PR.
- Rewriting the index on every history event is more write traffic than a stale-set diff would be.
  It is accepted for the pilot because the named index holds only openable, existing local files,
  the history is small, and correctness beats traffic here. A later change can keep a
  per-launch in-memory set to avoid the rewrite without reintroducing persisted state.
- `PlayedMediaCore.staleIdentifiers` was removed rather than left unused: with no read-back there is
  no stale set to compute, and dead code with tests is still dead code. The guarantees it encoded
  are now covered by the shared mapping tests plus the rewrite itself.
- The named index is per-application state; a reinstall or a changed bundle identifier leaves a
  stale index that only a full reconciliation can clear. The rewrite on launch is that mechanism.
