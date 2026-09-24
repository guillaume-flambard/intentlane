# Candidate qualification

Qualification for task group 1. Every row was produced by cloning the repository,
reading its own licence and contribution files, and running the project's audit. No
claim below comes from memory about the application.

Screening clones live in `~/projects/active/apps/clients/intentlane-candidates`,
shallow at the revision recorded here. The audit was run as
`intentlane audit <repo> --platform macos --format json` with the local SDK
(macOS 27.0 build 26A428, Xcode 27 build 27A266a).

## The language of the application target, which decided the order

The screening did not record this, and it turned out to matter more than data
sensitivity. App Intents is Swift, so an application target with no Swift in it
cannot receive the mapping as the recipe was first written.

| Candidate | App target | Language in the target | Swift? |
| --- | --- | --- | --- |
| FSNotes | `FSNotes` | 229 Swift files | yes |
| HandBrake | `HandBrake` | 77 `.m` | no |
| LuLu | `LuLu` | 27 `.m` | no |
| Transmission | `Transmission` | 81 `.m` | no |
| Cyberduck | `app` | 6 `.m` over a Java application | no |

Four of the five qualified candidates are not Swift. This does not disqualify
any of them, and it is logged as a deviation rather than hidden: the recipe now
has step 4.1, "when the app target is not Swift", which adds Swift to the target,
exposes one read function and one open function through the bridging header,
and forbids converting the existing Objective-C.

It also reverses the pilot order that task 1.5 originally proposed. The first
pilot should be the one that can run the recipe as written, so that a
zero-deviation result means something. That is FSNotes, the only Swift target.
Cyberduck is still reserved for last, because a thin Objective-C shell over a
Java application is the case where the recipe may simply not apply.

One more FSNotes detail, recorded so it cannot be confused later: the audit found
`import AppIntents` evidence in the **iOS** target's `AppDelegate`, not in the
macOS app. The macOS application is the integration target, and its existing iOS
surface is not ours to claim. The audit also reports `data.privacy: missing` and
a data classification of `sensitive, personal, public` for a note application,
which is expected and is the reason the pilot runs on fixtures only.

## What the tool found, and the defects the screening exposed

Every candidate scores `0/84 (none)` with `discovery: none`, which is expected:
none of these applications ships App Intents today. What separates them is
whether there is a macOS Xcode application target to integrate into, and that is
what qualification has to establish.

The screening exposed three defects in `intentlane audit`. The first two are now
fixed, and the numbers below were re-measured with the fixed tool. The third is
recorded as a limitation a reader must keep applying by hand.

1. **A target inherits SDKROOT from the project build configuration.** Fixed.
   CotEditor declares `SDKROOT = macosx` once, on the project configuration list,
   and its targets inherit it. The audit read only the target's own list, so it
   resolved no platform, reported `scoped: false`, and computed `discovery` over
   the whole tree. It now reads the project level as a fallback, after the target
   level, for both a declared `SDKROOT` and an xcconfig anchor. CotEditor now
   reports three macOS targets and `discovery: shortcuts-only`, which is the
   profile the screening had predicted and the one NetNewsWire had.
2. **The route claimed a native platform with no target for it.** Fixed. Ardour
   ships a macOS crash reporter and a macOS audio library as Xcode projects
   while its application is C++ built with waf and contains no Swift. The route
   read only the file list, saw an `.xcodeproj`, and reported `native/high`. It
   now takes the parsed target evidence and reports `unknown` when the project
   carries no target for the audited platform, or when every target compiles for
   another one. A target that exists but whose platform is unresolved is left
   alone, because a real target with an unreadable SDKROOT is still a target.
3. **Still open: helpers are not the application.** Krita's route is
   `native/high` and it does resolve four macOS targets, but they are
   `krita-preview`, `krita-preview_helper`, `krita-thumbnailer` and
   `krita-thumbnailer_helper`. The application is a CMake/Qt build. Nothing in
   the tool knows that a Quick Look preview helper is not the app, so this
   rejection rests on reading the target names, which is exactly what a
   qualification is for.

A third, smaller problem was fixed alongside: `intentlane audit` on a directory
that does not exist used to print a clean, empty report and exit zero, which is
indistinguishable from a project that implements nothing. It now refuses and
names the path. That matters here, because a wrong path would have qualified a
candidate for the wrong reason.

## Measurements after the fixes

| Candidate | Route | Score | Discovery | Targets for macos |
| --- | --- | --- | --- | --- |
| FSNotes | `native/high` | 0/84 `none` | `none` | 2 |
| LuLu | `native/high` | 0/84 `none` | `none` | 2 |
| HandBrake | `native/high` | 0/84 `none` | `none` | 8 |
| Transmission | `native/high` | 0/84 `none` | `none` | 20 |
| Cyberduck | `native/high` | 0/84 `none` | `none` | 1 |
| CotEditor | `native/high` | 10/84 `early` | `shortcuts-only` | 3 |
| Ardour | `unknown/high` | 0/84 `none` | `none` | 0 |
| Krita | `native/high` | 0/84 `none` | `none` | 4, all helpers |
| Zed | `ineligible/high` | 0/84 `none` | `none` | 0 |

Campaign-wide gap: all candidates report 5 of 9 conditions recorded, with
`appleIntelligence`, `account`, `permissions` and `testData` missing. That should
be recorded once, not five times.


## Qualified, five candidates

Each has a native macOS Xcode application target, a licence that permits a local
fork for a proof, and a data model materially different from the others.

| Candidate | Revision | Licence | macOS target | Domain | Discovery |
| --- | --- | --- | --- | --- | --- |
| FSNotes | `a96b9b5` (2026-09-20) | MIT | `FSNotes.xcodeproj` | notes | none |
| LuLu | `7d2669e` (2026-08-05) | GPLv3 | `LuLu/LuLu.xcodeproj` | endpoint security | none |
| HandBrake | `1255087` (2026-09-24) | GPLv2 | `macosx/HandBrake.xcodeproj` | media batch | none |
| Transmission | `48835c6` (2026-09-04) | GPLv2 or GPLv3 | `Transmission.xcodeproj` | torrents | none |
| Cyberduck | `fc0d437` (2026-09-22) | GPL | `Cyberduck.xcodeproj` | file transfer | none |

### FSNotes, notes

`CODE_OF_CONDUCT.md`, no `CONTRIBUTING.md`, MIT. Two Xcode targets at the root
project plus an iCloud variant. The data is user writing: folders, notes, tags.
The safe projection is a folder and a note title, never a body, never an
attachment, and an identifier that is not derived from the text. The action
candidate is opening a note by title. The sensitivity is the sharpest in the set,
because a note title is the most revealing short piece of text a user owns, so the
projection has to be opt-in per folder rather than global. The honest Siri
hypothesis is not that Siri will work: it is that a note can be named by its
title and found again, and that the identifier survives the note being renamed,
which the IINA decision already showed is the hard part.

### LuLu, endpoint security

GPLv3, no `CONTRIBUTING.md`. The data is firewall rules: observed and allowed host
applications, and their network permissions. The safe projection is a rule made
of a bundle identifier and a state, never a network payload and never an
observation log. The action candidates are pausing and resuming a rule, which are
exactly the system-exposed action shape. The sensitivity is structural rather than
personal: the list of installed applications is itself a fingerprint, so the
projection must expose the application and not the user. This is the best test of
the "never expose a secret" rule in the set, because a security tool's data is
dangerous by nature.

### HandBrake, media batch

GPLv2, `CONTRIBUTING.md` and a code of conduct. The data is presets and a queue:
a preset has a name and settings, a queue item has a source and a destination.
The safe projection is a preset name and a queue state, never a source path and
never a destination path. The action candidates are starting, pausing and
removing a job. The sensitivity is low, which makes it the pilot where the method
should be easiest, and therefore the pilot that would expose a flawed recipe
first.

### Transmission, torrents

Dual licensed GPLv2 or GPLv3, with a `CONTRIBUTING.md` and a per-component
`licenses/` directory. The data is torrents: peers, trackers, magnet links, and
the files being shared. The safe projection is a torrent display name only,
never peers, never tracker URLs, never IP addresses, and the identifier must not
be the infohash exposed in a form that lets a system infer the content. The
action candidates are pause, resume and remove. This is the strongest sensitivity
test in the set after notes, because a torrent name is a statement about what
somebody is downloading.

### Cyberduck, file transfer

GPL, no `CONTRIBUTING.md`, so the contribution path is issues and discussions
only. The data is connection bookmarks, which reference hosts and, in the
keychain, credentials. The safe projection is a connection profile *alias*, never
the host, never the username, never anything from the keychain. The action
candidate is opening a connection. This candidate exists in the set precisely
because it is the hardest privacy case: the application's central object *is* a
credential reference, so a mapping that gets this wrong is visibly wrong.

## Rejected, four candidates, with the reason

- **Krita**, `188d778` (2026-09-24), GPLv3 with a separate licence for the CMake
  scripts. Rejected on the route, not on the licence: the application is a
  CMake/Qt build, and the only macOS targets the audit can see, under
  `krita/integration/integration.xcodeproj`, are a Quick Look preview helper and a
  thumbnailer. The route reports `native/high` because those targets really are
  native and really are macOS; the rejection rests on their names, not on the
  tool. Worth revisiting if a non-native route is ever in scope.
- **Zed**, `6fae7f3` (2026-09-24), Apache-2.0 or GPLv3, with a
  `CONTRIBUTING.md`. Rejected on the route: the audit reports
  `route: ineligible` with zero macOS targets, because the application builds with
  its own system rather than from an Xcode project.
- **Ardour**, `71074fe` (2026-09-24), GPL. Rejected: zero macOS targets found for
  the application. It used to report `native/high`, which the route fix corrected
  to `unknown/high`; the rejection rests on the same fact, but the tool now says
  so instead of contradicting it.
- **CotEditor**, `5e7d853` (2026-09-24), source under Apache-2.0 with a root
  licence of CC BY-NC-ND for bundled assets. Rejected because the fixed audit now
  classifies it `shortcuts-only`: it ships `import AppIntents` in
  `DocumentShortcuts.swift`, which is the same profile NetNewsWire had and
  therefore not representable as Siri AI discovery. The NC-ND asset licence
  complicates redistribution but would not on its own have rejected a local fork.

## What is still open before the first pilot

1. Run the recipe on FSNotes: audit, contract, generation, mapping, tests, build,
   metadata, certification, with every stage timed and every deviation logged.
2. Use HandBrake as the first test of step 4.1, the Objective-C path, and measure
   what it really costs instead of estimating it.
3. Record `appleIntelligence`, `account`, `permissions` and `testData` once, in
   the shared conditions, instead of per pilot. Every candidate reports five of
   nine conditions, with the same four unknown.
4. Keep reading the target names. The tool cannot tell a Quick Look helper from
   the application, so that judgement stays human and belongs in the
   qualification record rather than in a score.
