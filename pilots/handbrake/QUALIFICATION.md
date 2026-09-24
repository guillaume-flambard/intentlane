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

## What is deliberately not claimed

No Siri conversation, no Spotlight result, and no `system.searchInApp`. No
incremental reindexing on preset creation or deletion. The system reindexes the
named index on demand, and this pilot does not pretend otherwise.

## Not measured

Whether the registration actually runs at launch. That needs a graphical session
and a launch probe, which is the one gate IINA has and this pilot does not. The
build proves the code compiles and the call is wired; it does not prove the process
registers.
