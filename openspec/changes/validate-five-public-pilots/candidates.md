# Candidate qualification

Qualification for task group 1. Every row was produced by cloning the repository,
reading its own licence and contribution files, and running the project's audit. No
claim below comes from memory about the application.

Screening clones live in `~/projects/active/apps/clients/intentlane-candidates`,
shallow at the revision recorded here. The audit was run as
`intentlane audit <repo> --platform macos --format json` with the local SDK
(macOS 27.0 build 26A428, Xcode 27 build 27A266a).

## What the tool found, and two defects it exposed

Every candidate scores `0/84 (none)` with `discovery: none`, which is expected:
none of these applications ships App Intents today. What separates them is
whether there is a macOS Xcode application target to integrate into, and that is
what qualification has to establish.

The screening also exposed two defects in `intentlane audit`, which matter more
than the shortlist because they would have produced wrong classifications:

1. **The audit cannot see `PBXFileSystemSynchronizedRootGroup` targets.**
   CotEditor uses nine of them, so the audit reports its targets with empty
   `files` and reports `discovery: none` for an application that *does* ship
   `import AppIntents`. Any qualification that trusts `discovery: none` on a
   modern Xcode project is unsound. This is a defect to fix before the first
   pilot runs, because `discovery` is exactly the field that separates a
   Shortcuts-only profile from a schema-capable one, as NetNewsWire showed.
2. **The audit can report `route: native` with zero macOS targets.** Ardour
   reports `targets: []`, `scoped: false`, and still `route: native/high`.

A third, smaller inaccuracy: the audit printed Krita's preview files as
`krita-preview/PreviewProvider.swift` when the real path is
`krita/integration/krita-preview/PreviewProvider.swift`.

Campaign-wide gap: all nine report 5 of 9 conditions recorded, with
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
  CMake/Qt build, and its only macOS Xcode target is a Quick Look preview helper
  under `krita/integration/integration.xcodeproj`. There is no native Xcode
  application target to integrate with, so the native route does not apply to the
  app itself. Worth revisiting if a non-native route is ever in scope.
- **Zed**, `6fae7f3` (2026-09-24), Apache-2.0 or GPLv3, with a
  `CONTRIBUTING.md`. Rejected on the route: the audit reports
  `route: ineligible` with zero macOS targets, because the application builds with
  its own system rather than from an Xcode project.
- **Ardour**, `71074fe` (2026-09-24), GPL. Rejected: zero macOS targets found.
  Recorded alongside the audit defect above, since it also reports
  `route: native/high`, which is wrong for a repository with no target.
- **CotEditor**, `5e7d853` (2026-09-24). Rejected for two independent reasons.
  Its project uses nine `PBXFileSystemSynchronizedRootGroup` entries, so the audit
  cannot see its sources and reports `discovery: none` for an app that ships
  `import AppIntents` in `DocumentShortcuts.swift`, which is the same
  Shortcuts-only profile NetNewsWire had. Its root licence is also
  CC BY-NC-ND for bundled assets, with the source under Apache-2.0, which
  complicates redistribution even though the code licence would allow a local
  fork. The licence alone would not have rejected it; the existing Shortcuts
  surface plus an unreadable project would have.

## What is still open before the first pilot

1. Fix the audit's handling of synchronized root groups, then re-run the
   classification. Until then, `discovery` is unreliable on any modern Xcode
   project, and no candidate may be called Shortcuts-only on the audit's word.
2. Choose the first pilot. The method should be tried where it is easiest, which
   by the sensitivity table is HandBrake, and the hardest case, which is
   Cyberduck, should be reserved for when the recipe has survived one success.
3. Record `appleIntelligence`, `account`, `permissions` and `testData` once, in
   the shared conditions, instead of per pilot.
