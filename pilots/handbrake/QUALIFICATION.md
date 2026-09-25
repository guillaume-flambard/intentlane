# HandBrake pilot

- **Application**: HandBrake, a macOS video transcoder
- **Revision**: `1255087`, shallow clone, no submodules, origin set to the real upstream
- **Licence**: GPLv2
- **Platform audited**: macOS
- **Second pilot because**: it is the first non-Swift target, so it is the first real
  test of step 4.1. Three more qualified candidates are Objective-C and one is a
  Java application behind an Objective-C shell, so this pilot is the one that
  decides whether the method is a method.

## What the pilot certifies

```
pass  contract [deterministic]: verified
pass  generated [deterministic]: verified
pass  applicationTests [deterministic]: verified
pass  integrationTests [deterministic]: verified
pass  metadata [deterministic]: verified
pass  indexSync [deterministic]: verified
```

53 checks in three suites, none of which compile a line of HandBrake: 23 pure
rules, 21 integration, 9 index lifecycle. `BUILD SUCCEEDED` for a 77-file
Objective-C app target that now contains the generated App Intents code, and the
extracted metadata advertises exactly `OpenPreset` with the `system.OpenIntent`
schema, plus the `IntentLanePresetEntity`. No App Shortcut, no extra action.

## The object, and why not a title

A built-in preset. Not a title: titles are transient scan results, empty until the
user opens a source, so a pilot over titles could resolve nothing from a cold
start. Not a source: HandBrake has no list of sources, and `openURLs:` replaces
the current source and resets the current settings.

Exposed: the preset name, and its category path when it has one, so two presets
sharing a name in different categories stay two distinct choices. The identifier is
the path joined to the name, and a bare name is not an identifier.

Excluded: a preset the user created, because its name is written by the person and
can carry a client name; a preset the app marks unsupported, because offering it
would offer something that cannot run; and a category, because a category is not a
preset. No file path, no JSON content, no encoder settings.

## The surface shrank, and that is the finding

The contract originally carried the same two surfaces as FSNotes. Reading the app
removed the second: HandBrake's presets view has an `NSTreeController` and no
search field anywhere, so `system.searchInApp` has no in-app list to route a term
into. Implementing "search" as "select the one node whose name matches" would
advertise a system surface the application does not have.

So the rule the campaign now uses is: a claim set may shrink for a stated reason
about the application, never for a reason about the stack, and never past what a
command proves. The six deterministic claims are identical for both pilots. What
differs is what the contract exposes inside them, and that difference is an
application fact written down in the contract.

## Does HandBrake expose a deletion or rename event?

Yes, and it already has one for exactly this purpose, unused. This was read
before writing anything, because it decides whether `indexSync` is a mutation hook
or an on-demand reindex.

`HBPresetsManager` sets itself as the delegate of the whole preset tree at
`HBPresetsManager.m:32`, and that tree implements a callback that is currently
used for one thing only:

```
HBPresetsManager.m:50   nodeDidChange:        posts HBPresetsChangedNotification
HBPresetsManager.m:59   treeDidRemoveNode:    picks a new default preset
```

`HBTreeNode` calls `nodeDidChange:` on every insert, every removal and every
replacement (`HBTreeNode.m:58`, `:65`, `:71`), and it sets the delegate down the
whole tree as children are added. So a single observer on
`HBPresetsChangedNotification` sees a preset being created, deleted or renamed
without the pilot touching the deletion path, the alert, or the tree controller.

The mutations that matter, and where they land:

| Mutation | Source |
| --- | --- |
| The user deletes a preset | `HBPresetsViewController.m:469` to `deletePresetAtIndexPath:` |
| A preset is renamed | `HBController.m:1781` to `replacePresetAtIndexPath:withPreset:` |
| A preset is added | `HBPresetsManager.m:241` |
| The root itself mutates | `HBTreeNode.m:58`, `:65`, `:71`, each calling `nodeDidChange:` |

Two things the pilot must not do. It must not hook `deletePreset:` itself, because
that is the alert path, not the commit path, and a deletion can also arrive from
the tree being reloaded. And it must not infer which preset was removed from the
notification, because the notification carries no node: the correct move is to
diff the eligible set before and after, and remove the identifiers that went away.

So the pilot has a real event to wire, and it has a better one than the obvious
one. Task 0.4 of the next change applies.

## Step 4.1, the Objective-C to Swift step, measured

The app target is 77 `.m` files and no Swift. Four things were needed, and all four
belong in an upstream pull request rather than in pilot scaffolding:

1. A bridging header, `macosx/IntentLane/IntentLane-Bridging-Header.h`, importing
   the five real headers the Swift file calls. No shim, nothing invented.
2. Three properties promoted out of class extensions into their headers:
   `HBAppDelegate.presetsManager`, `HBAppDelegate.mainController` and
   `HBController.presetView`. An Objective-C app keeps these private in `.m`, and
   Swift cannot see them, so the pilot promotes exactly three and no more.
3. Two build settings, `SWIFT_OBJC_BRIDGING_HEADER` and `SWIFT_VERSION`, because
   the target had no Swift at all and therefore neither setting.
4. One import and one call, so the Objective-C app can call the Swift code:
   `#import "HandBrake-Swift.h"` and `[HBIntentLanePresetIntegration register]`
   inside `if (@available(macOS 27.0, *))`.

No Objective-C was converted, and no existing file was rewritten.

Two build errors were worth having, because the build is the only test this file
has. The bridging header initially did not expose `HBAppDelegate`, and the
registration class was not main-actor isolated while it assigns main-actor statics.
Both are the kind of thing that only a real Objective-C target produces.

## The split, and what it proved

Four files, and one of them is the proof: `PresetCore` imports only Foundation,
`PresetHandlers` and `PresetIndex` import AppIntents, and `PresetIntegration` is the
only file that speaks Objective-C. It is deliberately excluded from every test
compile. The eligibility rules, the resolver and the open decision are all covered
by tests that never launch HandBrake, which is the same property FSNotes proved on
a Swift target.

The generated Swift is structurally identical to FSNotes's. The contracts differ in
one intent, and 90 of 167 lines differ in the generated output, every one of them
vocabulary: the entity name, the intent name, the subtitle field, the index name.
Same protocols, same availability annotation, same resolver shape.

## The launch probe, and what this pilot had to change to make one

`python3 pilots/handbrake/tests/launch-probe.py --app <HandBrake.app>` launches the
built application, reads one line from its standard error, and reports the
registration state and the named index. It carries the three statements it is not
entitled to make silently, because it does not prove the Siri conversation, does not
prove anything appears in Spotlight, and does not prove the open path selects a
preset.

Three things this pilot forced, which is what the recipe asks a pilot to record:

- **The log is HandBrake's own facility, on standard error.**
  `HBUtilities.writeToActivityLogWithNoHeader:` is the variant Swift can call, since
  `writeToActivityLog:` is a C variadic and Swift cannot import one at all. The
  FSNotes half has no equivalent and uses `print`, so the probe reads whichever
  stream its application writes and collects both, because the reason a launch
  produced nothing arrives on the stream the marker is not on.
- **The adapter's log line had to be added, not found.** IINA and this pilot both
  needed it, IINA's came first, and the shape came from there. What came from this
  pilot is the decision to log the index name verbatim, because a probe that reports
  the name in the source file reports the source file, not the system.
- **Registration is called from `HBAppDelegate`,** at
  `applicationDidFinishLaunching` on line 98, so the probe waits for the line rather
  than for the presets window, which a first launch may open behind a licence
  dialog.

**The end-to-end launch was not performed on this machine** and is not claimed. The
agent process may not spawn into the Aqua session, and the probe says so and skips
rather than reporting a failure against an adapter it never observed. What is proved
is the part that actually breaks: `tests/probe/test-launch-probe.py` holds the
probe's regular expression against the registration literal read out of the built
binary, so the two sides cannot drift apart silently. That test was seen failing
against the binary built before the adapter logged, and passing after.

**Index removal is wired, through the event HandBrake already had.**
`bash pilots/handbrake/tests/run-deletion-tests.sh` compiles the real
`HBPresetsManager`, `HBTreeNode`, `HBPreset` and `HBMutablePreset`, calls
`hb_global_init` the way the application does at startup, and deletes one of
HandBrake's own built-in presets from the real tree. The delete is the real
`deletePresetAtIndexPath:` and the event is the real
`HBPresetsChangedNotification`.

The event carries no node, so the wiring cannot be a removal call without guessing
which preset went away. It reconciles by diffing the eligible set instead, which is
also what catches a rename, since the identifier is the category and the preset
name. Thirteen checks, and the red was proven by removing the observer's body, which
fails on four lines, the first naming the identifier that should have been dropped.

The observer is held in a static and is an `NSObject` rather than the block form,
because a block token deallocated with its scope would stop reconciling silently.
That is this defect wearing a different hat.

The tree mapping and the observer moved out of `PresetIntegration.swift` into
`PresetRecords.swift` and `PresetObservation.swift`, because that file reads
`NSApplication.shared.delegate` and cannot be compiled without the whole
application, while the mapping decides the identifier and the observer is the
wiring. `PresetIndex.swift` speaks no HandBrake symbol again.

## What is deliberately not claimed

No Siri conversation, no Spotlight result, and no `system.searchInApp`.

**Whether the registration runs at launch is still not claimed, and now the reason is
narrower than it was.** The launch probe exists and it runs, and on this machine it
decides in 0.6 s that the agent process may not spawn into the Aqua session, so it
skips and says so. What it has not done is observe the running process. On a desktop,
the remaining work is one command against the built bundle, and the probe's contract
with the application is already covered against the built binary.

The build proves the code compiles and the call is wired. It does not prove the
process registers, and the probe exists so that something other than the build is the
thing that will.
