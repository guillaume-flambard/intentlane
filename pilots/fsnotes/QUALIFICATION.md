# FSNotes pilot

- **Application**: FSNotes, a macOS note application
- **Revision**: `a96b9b5`, tag `v7.3.4`, shallow clone, no submodules
- **Licence**: MIT
- **Platform audited**: macOS
- **First pilot because**: it is the only qualified candidate whose app target is
  Swift, so it is the only one that can run `recipe.md` v1 as written. A
  zero-deviation result here is worth something; on an Objective-C target it
  would not be.

## Stage 1, audit, measured

Read-only, on the pinned revision, with the fixed tool. Wall clock 3.4 s, so the
real work at this stage is reading the application, not running the tool.

| Fact | Value |
| --- | --- |
| Route | `native` / `high` |
| Score | 0 / 84, band `none`, discovery `none` |
| Targets resolved | `FSNotes` macOS, `FSNotes (iCloud)` macOS, `FSNotes iOS` iOS, `FSNotes iOS Share Extension` iOS |
| Scoped | true, 229 Swift files in the macOS app target |
| Architecture | `local` / `high` |
| Conditions recorded | 5 of 9 |
| Toolchain | macOS 27.0, Xcode `27A266a`, arm64, `en-US`, region `US` |
| Conditions unknown | `appleIntelligence`, `account`, `permissions`, `testData` |
| Data classification | `sensitive`, `personal`, `public` |
| Privacy manifest | reported `missing` |
| Data indexed by the app | yes |
| Quality issues | 0 |
| Capabilities unknown | 29 catalogue entries, each with a gap code |

## Facts that must not be confused with ours

The audit found `import AppIntents` evidence in the **iOS** target's
`AppDelegate`, not in the macOS application. The macOS app is the integration
target, and the existing iOS surface is not an IntentLane claim and must never
be reported as one.

The 29 unknown capabilities are catalogue entries with gap codes, not defects.
`cross-app.transferable` is one of them, and the tool is right to say it needs a
documented journey and a platform matrix before anyone adds it.

## Sensitivity, and what it forces

A note application holds sensitive, personal and public content, and it already
indexes. Two consequences, both non-negotiable for this pilot:

1. Fixtures only. No real notebook, no iCloud account, no export. A first pilot
   that reads a user's notes is not a pilot, it is an incident.
2. Index the minimum. A folder is indexable; the body of a note is not. If the
   object chosen for the first mapping cannot be expressed as a folder or a
   template, the chosen object is wrong.

`appleIntelligence`, `account`, `permissions` and `testData` are unknown and are
the same four unknowns every candidate reports. They are recorded once for the
campaign in `candidates.md`, not per pilot.

## Not yet done

Stages 2 to 8 are not started. The deviation log and the effort sheet have rows
for them, marked `pending`, so the sheet cannot be mistaken for a finished pilot.
