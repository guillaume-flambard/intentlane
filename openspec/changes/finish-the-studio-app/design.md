# Finish the Studio app, design

## Context

See `proposal.md` for the motivation. What the implementation has to work with:

- `Package.swift` declares `platforms: [.macOS(.v14)]` and `Resources/Info.plist`
  declares `LSMinimumSystemVersion` 14.0. The toolchain is Xcode 27 stable
  (27A266a) against SDK 27.0, and Swift is already in language mode 6, which the
  build flags confirm.
- `IntentLaneStudioApp` is a `WindowGroup` with a `.defaultSize` and a single
  `CommandGroup(replacing: .newItem) {}`. There is no Settings scene, no About,
  no Help, and no journey shortcut.
- `StudioView.screens` is a `switch` over `StudioStage`, now six cases, with no
  indicator of position in the journey.
- `ProjectScreen` has a button labelled `Open recent` with
  `.disabled(true)` and a help string promising a run that does not exist.
- `Resources/en.lproj` and `fr.lproj` exist, `CFBundleLocalizations` lists both,
  and the French file holds twelve keys of which ten appear nowhere in `Sources/`.
- `Scripts/build-app.sh` already assembles the bundle, copies the engine and the
  pilot manifests, and localizes the resources. It is a good script and it is not
  the problem.

## Goals / Non-Goals

Design-level boundaries only.

- Every piece of this is a surface the reader can see or trip on. Nothing here
  changes what the engine asserts, what the audit reports, or what a proof says.
- The app is the operator's tool, not a client deliverable. That fact decides the
  platform floor and it is why supporting macOS 14 would be carrying a cost for
  nobody.

## Decisions

**1. The floor goes to macOS 27, arm64 only, and the decision is written down.**

macOS 26 was the last release bootable on Intel, so a new app with no Intel user
base may target arm64 alone; that is now mainstream, not exotic. The app has no
Intel user base, and raising the floor is what makes Liquid Glass and the rest of
the current surface reachable without a single availability ladder. The baseline
skill requires the architecture decision to be stated in the project's
`AGENTS.md`, so it goes there rather than living in a commit message.

**2. The localization claim is withdrawn, not honoured.**

Considered: localizing the six screens into French. Rejected for now, and the
reason is the buyer, not the effort. One operator uses this window, in French, so
the value of a French interface is the value of one person reading their own
language. The cost is every user-visible string in the app, which is exactly the
kind of work that grows instead of shrinking. The honest move at this stage is to
declare one language and say so in `AGENTS.md`, so the next reader knows it is a
decision. The alternative, leaving `fr.lproj` in the bundle, is the failure this
change exists to remove.

**3. The journey rail is restored, not invented.**

The dead French keys name three steps: project and result, running, result and
proofs. The rail takes that shape, and it reads its step list from the stage
enum rather than from a second list, so M4, M5 and M6 add a case and the rail
shows it. Considered: `NavigationSplitView` with a sidebar. Rejected: the journey
is linear and a sidebar implies a place to roam, which this product does not have.
A rail states position and progress without offering a destination the reader
cannot use yet.

**4. The recent list is a file the app owns, in Application Support.**

Considered: `UserDefaults` with a string array. Rejected on robustness rather than
size: a truncated or hand-edited preferences file would produce a list of paths
that no longer exist, and the app would offer dead entries. A JSON file with the
project path, its last revision and the date it was opened is inspectable, and an
entry whose path is gone is dropped rather than shown.

Considered: scene restoration. Rejected as the mechanism: restoration puts back a
window, not a project, and the reader reopening a project is a decision, not a
side effect of relaunch.

**5. Glass is applied to the functional layer only.**

Navigation, the footer controls and the rail are functional layers and may be
translucent. The surfaces a reader reads from, such as a findings table and the
inspector, stay opaque, because translucency behind text costs contrast and the
content is the product here. The theme keeps its own palette for content; glass
is added where the layer is functional.

**6. The menu carries the journey, not a suppressed default.**

Removing `.newItem` and adding nothing leaves a Mac application with a File menu
that cannot do anything. The journey's own actions become commands with
shortcuts, so the reader can run the audit or reach the deliverable without the
mouse, which is the same reachability `AccessibilityTests` already asserts for
the stages.

## Risks and trade-offs

- [Raising the floor locks out an old Mac] → Accepted and stated. The app is the
  operator's tool on the current release, and no client installs it. The cost of
  carrying macOS 14 support would be an availability ladder across every screen
  for a platform nobody runs this on.
- [Withdrawing French is read as a regression] → It is written down in
  `AGENTS.md` as a decision with its reason, so the next reader sees a choice
  rather than an omission.
- [The rail becomes a second list of steps that can drift] → It reads the stage
  enum, and a test asserts the rail shows the stage the model is on.
- [The recent list grows unbounded or holds dead paths] → Entries whose
  repository is gone are dropped when the list is read, and the most recent ten
  are kept.
- [Glass applied too widely costs readability] → The rule is in the requirement,
  and the snapshot harness renders the dark appearance as well as the light one,
  so a contrast regression shows up as an image rather than as a preference.
- [Scene work grows without a buyer] → Every task is scoped to something the
  reader sees before the public-surface milestone. The order in `tasks.md` puts the
  honesty fixes first, because an app that lies about itself is the one defect no
  amount of polish hides.

## Migration Plan

No migration. The app is not distributed to clients, so there is no installed
base to move. The bundle is reassembled by the existing script; removing the
French resources and raising the floor are both visible in the built app and
revertible by rebuilding.

## Open Questions

- Whether the interface should be French is answerable later without changing a
  requirement: it affects strings, not behavior. The decision and its reason are
  recorded so the reversal is a deliberate act.
- Whether the rail should grow a sidebar once M4 introduces a choice of journeys
  is answerable later. A rail that cannot hold a choice is still correct now.
