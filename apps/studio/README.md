# IntentLane Studio

A macOS window that drives `intentlane pilot run` end to end on a repository you choose. It does
not reimplement the engine: it launches it, collects what it printed, and reads
`.intentlane/run/journal.json` back through the same schema.

Build it with `Scripts/build-app.sh`, which assembles `build/IntentLaneStudio.app` with the engine
and the pilot manifests inside `Contents/Resources`. Test it with `swift test` in this directory.

## The journey

Five screens, and no dashboard before or after them.

1. **Project.** A drop zone, and the promise made before anything is chosen: the work happens in an
   isolated worktree and the current branch stays untouched. After choosing, only the app name, the
   repository, the branch and revision, the detected target and the platform.
2. **Goal.** One question, and the journeys the project's own contract can deliver, written as
   outcomes. The Apple types are behind a "How this works" disclosure, and what the contract leaves
   out is said out loud.
3. **Plan.** The route from the application as it is to the result, with the owner of each step
   (IntentLane, agent, app code, human) and whether it is ready, needs a person, or is not yet known.
4. **Work.** The route, advancing as the engine settles steps. The current step is named in the
   present tense. The technical log is collapsed, because it is not the product.
5. **Result.** Three outcomes kept apart: verified, built and awaiting one human check, or stopped
   with a reason.

The route is the one drawing: a thin line joins the steps, the part that happened is solid, the part
that has not is an outline, and a block leaves the line visibly halted. Every state is also a word,
so nothing is carried by colour alone.

## Verifying the design

The screens are drawn by the same view code the window runs, at 1280x820, 1000x700 and 960x640, in
light and dark, and every render is checked for being non-empty:

```bash
INTENTLANE_STUDIO_REPO=/path/to/intentlane-fsnotes \
INTENTLANE_STUDIO_SNAPSHOTS=/tmp/intentlane-snapshots \
swift test
```

`INTENTLANE_STUDIO_REPO` must point at a checkout that has a real run journal. Without it the screens
that show a real run are not drawn rather than drawn from a fixture, and the run and result screens
are absent rather than faked.

Two tests measure the renderer itself, because a blank snapshot has to be attributable: text is
drawn offscreen, and a `ScrollView` is not. `ScreenScroll` exists for that reason, and the shipped
screens scroll exactly as they otherwise would.

## Support limits

- **One integration in the window.** The goal screen is derived from one pilot contract,
  `pilots/fsnotes`. A repository that carries its own `contract.yaml` or `pilots/fsnotes/contract.yaml`
  takes precedence over the shipped one. The other manifests in the bundle (handbrake, iina,
  netnewswire) are not offered.
- **No delivery.** The engine has no `demonstrate` step and no `deliver` step, so a run cannot reach
  `deliver`. It stops at the first of them, and the result screen says which state it reached.
- **`test` stays blocked.** Two surfaces have to be observed by hand: a system search result that
  opens the exact item, and the Siri conversation itself. No suite observes them from an agent shell
  that has no accessibility permission, so the headline stays "Integration built" with the reason
  the engine gave, not "Integration ready".
- **Nothing is written to your checkout.** The work happens in an isolated worktree created by
  `Worktree.create`, the diff is displayed and never applied, and nothing is pushed.
- **A project needs a contract.** Without one the window says so on the first screen instead of
  offering a journey it cannot build.

## Layout

```
Sources/StudioCore/   the engine's data, typed, with no SwiftUI
Sources/StudioUI/     the design system, the components and the screens
Sources/IntentLaneStudio/  the @main app, which is the bundle
```

`StudioUI` is a library rather than part of the executable so the snapshot tests can render the same
views the window runs. A snapshot drawn by a copy of a screen would only prove that the copy looks
right.
