## Why

The IINA pilot adapter compiles, links into the real `IINA.app` and is present in the
binary metadata, but nothing ever registers it. `IntentLanePlayedMediaAdapter.register()`
and `refreshIndex()` have no call site, so at runtime `IntentLaneEntityResolvers.played_media`
stays `nil` (the query returns an empty list) and the open and search handlers would throw
`IntentLaneHandlerError.missingHandler`. The `applicationTests: pass` gate is misleading: the
`--app-test` command only runs the pure-core tests, so nothing exercised the runtime wiring.

The pilot is therefore inert until the resolver, the handlers and the Spotlight lifecycle are
actually driven by the application.

## What Changes

- Register the resolver and both handlers once, at launch, behind a `macOS 27` availability guard.
- Drive the named Spotlight index from the real history events: `iinaHistoryUpdated`, and the
  `recordPlaybackHistory` preference being switched on or off.
- Empty the index when history recording is disabled, and remove entries whose file disappeared.
- Stop duplicating index state in `UserDefaults`; derive the stale set from the named index itself.
- Extract the single history-to-record mapping shared by the resolver and the index refresh.
- Add a runtime probe that makes the registration observable instead of assumed.

## Capabilities

### New Capabilities
- `iina-playedmedia-runtime`: the IINA pilot is registered and its Spotlight lifecycle follows the real history.

### Modified Capabilities
- Aucun.

## Impact

Pilot worktree `~/projects/active/apps/clients/intentlane-iina` (branch
`intentlane/pilot-playedmedia`): `iina/IntentLane/*`,
`iina/AppDelegate.swift`, one new `IntentLane` group in `iina.xcodeproj/project.pbxproj`.
No upstream change, no contact, no pull request.
