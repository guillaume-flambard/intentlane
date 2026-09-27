## 1. Registration

- [x] 1.1 Add a launch-time registration in `AppDelegate`, guarded by `if #available(macOS 27.0, *)`,
      registering `IntentLaneEntityResolvers.played_media`, `IntentLaneIntentHandlers.open_played_media`
      and `IntentLaneIntentHandlers.search_played_media`.
- [x] 1.2 Record a registration flag readable by a runtime probe.
- [x] 1.3 Add a dedicated `IntentLane` group in `iina.xcodeproj/project.pbxproj` instead of filing
      the pilot files under the `Views` group.

## 2. Spotlight lifecycle

- [x] 2.1 Extract the shared history-to-record mapping used by both the resolver and the refresh.
- [x] 2.2 Refresh the named index on `iinaHistoryUpdated` and after the background queue drains.
- [x] 2.3 Reconcile when `recordPlaybackHistory` switches off: remove every indexed entry.
- [x] 2.4 Remove entries whose local file disappeared, and entries removed by clearing history.
- [x] 2.5 Compute the stale set from the named index instead of `UserDefaults`, and delete the
      `indexedIdentifiersKey` bookkeeping.

## 3. Proof

- [x] 3.1 Build `IINA.app` and confirm the app still links and the metadata still carries
      `IINA.OpenPlayedMedia` and `IINA.IntentLanePlayedMediaEntity`.
- [x] 3.2 Run a runtime probe proving the resolver is non-nil after launch.
- [x] 3.3 Re-run `intentlane verify` and record the unchanged automatic gate result.
- [x] 3.4 Record explicitly that the `applicationTests` gate still covers only the pure core until
      `prove-iina-automatic-gates` lands.

## Notes

- Task 2.5 shipped as a full rewrite of the index rather than as a stale-set diff. App Intents in
  the macOS 27 SDK exposes no way to read a named index back, so the refresh removes the entity
  type and re-indexes the current openable history. That makes drift impossible by construction.
  `PlayedMediaCore.staleIdentifiers` was removed instead of being left unused.
- The runtime probe deletes the flag, launches the built app, and reads the flag back with
  `defaults read com.colliderli.iina dev.memolabs.intentlane.iina-pilot.played_media.registered`.
  Observed: `1` three seconds after launch, process still alive at ten seconds, no crash report.
- `applicationTests` now runs 18 checks against the pure core. It does not yet cover the open path,
  the index or the registration; that is `prove-iina-automatic-gates`.
