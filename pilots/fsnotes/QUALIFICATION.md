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
| App deployment floor | macOS 10.14 on some targets, 12.4 on others, while App Intents needs macOS 27 |
| Bundle id | `co.fluder.FSNotes` |
| URL scheme | `fsnotes` |
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

## Stage 2, contract, measured

`contract.yaml` validates: `Valid IntentLane 0.1: 2 intent(s) ready`. The pilot
manifest parses, and `intentlane verify --pilot pilots/fsnotes/pilot.yaml --strict`
currently reports `contract` as `pass` and the other five claims as `fail` or
`missing`, then exits non-zero with `blocked`. A pilot in progress is therefore
visibly in progress, and cannot be mistaken for a certified one.

One object, two surfaces, no writes:

| Intent | Schema | Target |
| --- | --- | --- |
| `open_notebook` | `system.open` | select the notebook in the existing sidebar |
| `search_notebooks` | `system.searchInApp` | land in FSNotes' own list, filtered |

Exposed on the entity: the folder name, plus the ancestor path only when the
folder is nested, so two folders with the same name stay two distinct choices.

Deliberately not exposed: note bodies, note previews, tags, note counts, file
paths, and any folder that is encrypted, trashed, virtual or a bookmark. The
encrypted exclusion is the user's decision, and it covers unlocked encrypted
folders too, because the folder name is itself the sensitive part.

## The model, as read from the application

- A notebook is a directory on disk. `Project` in
  `FSNotesCore/Business/Project.swift` holds `url`, `label`, `isEncrypted`,
  `isTrash`, `isVirtual`, `isBookmark`, `parent` and `child`.
- The application already provides an identifier: `getMd5CheckSum()`, the md5 of
  the standardized path. Its envelope is narrow and is documented as such. It is
  stable across restarts and content edits, it breaks on a rename or a move, and
  it is pseudonymous rather than anonymous, since a hash of a path is
  guessable by dictionary on common folder names.
- Navigation needs no invention: `Storage.shared().getProjectBy(url:)` resolves
  the object and every selection goes through `selectRowIndexes` on the sidebar.
  One edge case to handle: a nested folder under a collapsed parent has no row,
  so the ancestors have to be expanded through the same API first.
- `getNotes()` filters the whole note list per call, so a note count in the
  subtitle would be quadratic in projects and notes. The count is omitted rather
  than made slow.

## Not yet done

Stages 3 to 8 are not started: generation, mapping, tests, build, metadata,
certification. The deviation log and the effort sheet have rows for them, marked
`pending`, so the sheet cannot be mistaken for a finished pilot.
