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

## Stage 3, generation, measured

```
validate   0.58 s
generate   0.53 s   created pilots/fsnotes/out/IntentLaneGenerated.swift
                     and the adapter template in the fork
--check    0.47 s   exit 0, which is the stage's exit criterion
```

About 1.6 s of tool time in total. The cost of this stage is the contract, not
the generation, which matters for pricing: once the contract is right, the
compiler side is free.

The working copy is an isolated clone at
`~/projects/experiments/intentlane-fsnotes`, pinned to `a96b9b5`, on
branch `intentlane/pilot-notebook`. Its `origin` is the local screening clone, so
it cannot push upstream even by accident.

What the generated code fixes, and what stage 4 must therefore honour:

- Named index `dev.memolabs.intentlane.fsnotes-pilot.notebook`, derived from the
  app id and the entity id. The index test in stage 5 must use exactly this name.
- `IntentLaneNotebookEntity(id:title:context:)`, three fields, no more.
- Three resolver methods: exact identifiers, text match, and suggestions. The
  template's own wording is that an unknown identifier returns no entity and an
  unknown name returns no entity.
- Two handler methods: the open handler receives the entity and must throw rather
  than substitute a similarly named record; the search handler routes the in-app
  search and must not open a record, so a query with no exact match opens nothing.
- Indexing is called after a committed create or update, not at launch, and
  removal takes exact identifiers.
- Everything is annotated `@available(macOS 27.0, *)`, which is the availability
  guard the recipe asks for, already emitted by the generator.

The adapter template deliberately contains no App Shortcuts registration, so the
pilot advertises no Shortcuts surface.

## Stages 4 to 8, done, certified

```
pass  contract [deterministic]: verified
pass  generated [deterministic]: verified
pass  applicationTests [deterministic]: verified
pass  integrationTests [deterministic]: verified
pass  metadata [deterministic]: verified
pass  indexSync [deterministic]: verified
certified: Certified for the declared claims only: contract, generated,
applicationTests, integrationTests, metadata, indexSync.
```

`intentlane verify --pilot pilots/fsnotes/pilot.yaml --metadata <extracted> --strict`
exits 0. 63 checks in three suites, none of which launches FSNotes: 24 pure
rules, 30 integration, 9 index lifecycle.

### Does FSNotes expose a deletion, move or rename event?

Yes, and the app already funnels them. This was read before writing anything,
because it decides whether `indexSync` is a mutation hook or an on-demand
reindex.

**Deletion and external disappearance** both land in one place. `SidebarOutlineView.removeRows(projects:)`
is the single funnel, and it is called from exactly the paths that matter:

| Path | Source |
| --- | --- |
| The user deletes a folder | `SidebarOutlineView.swift:789`, after the confirmation alert |
| A folder vanishes from the disk | `FileSystemEventManager.swift:103`, on a directory change inside a hidden folder |
| A rename event arrives for a folder that no longer exists | `FileSystemEventManager.swift:116` |
| A folder is removed from the disk | `FileSystemEventManager.swift:134` |
| The launch-time diff finds removed folders | `ViewController.swift:244` |

That is five call sites converging on one function, which means one wiring point
covers deletion, external deletion and the rename that removes the old path. The
funnel is `remove(project:)` at `SidebarOutlineView.swift:1186`, which calls
`storage.removeBy(project:)` at line 1195.

**Creation** converges the same way, on `insertRows(projects:)` at line 1292, from
`Storage.insert(url:)` at `Storage.swift:287`.

**Rename and move are not single points.** A folder rename changes its path, so
the identifier changes, and FSNotes treats it as a removal of the old path plus an
insertion of the new one through `FileSystemEventManager`. There is no in-place
`project.url` update, which the review's worry about a stale identifier turns out
not to apply to: a rename is two events, and the removal half is the one that
matters for the index.

So the pilot has a real event to wire. Task 0.4 of the next change applies.

## Stage 4, the mapping, and how it was written

Test first, in two red steps, because Swift needs the types to exist before a
test can fail on a behaviour. The first run failed on missing files, the second
failed 14 assertions against deliberately empty implementations, and only then
did the rules get written.

The split is four files, and one of them is the proof:

| File | Imports | Covered by |
| --- | --- | --- |
| `NotebookCore.swift` | Foundation only | the 24 pure checks |
| `NotebookHandlers.swift` | AppIntents | the 30 integration checks |
| `NotebookIndex.swift` | AppIntents, CoreSpotlight | the 9 index checks |
| `NotebookIntegration.swift` | AppIntents, AppKit, and FSNotes | the build only |

`NotebookIntegration.swift` is deliberately absent from the test compiles. It is
the only file that knows `Project`, `Storage`, `ViewController` and the sidebar,
and it contains no business rule, which is why nothing in it needs a test to be
believed.

The generated adapter template was deleted rather than filled in. Its three
implementations became the split above, and keeping a half-filled duplicate would
have invited someone to edit the wrong one.

The eligibility rule is one line and it is the privacy decision made at stage 2:
not encrypted, not trashed, not virtual, not a bookmark, and not nameless. The
nameless part was found by the pure-rules suite, not designed: the first
implementation proposed an empty folder name as a valid choice, which can never be
resolved by name and can never be selected, so the test failed and the rule grew.

### The three FSNotes seams, all translation and no logic

- The project list becomes notebook records. The identifier is the application's
  own `getMd5CheckSum()`; the subtitle is `getNestedPath()`, which is empty for a
  top-level folder and therefore a `nil` subtitle.
- Opening finds the project whose checksum matches, expands its ancestors with the
  same `expandItem` call the app uses when restoring the sidebar, then selects the
  row exactly as `ViewController` does when it restores a project.
- Search sets the app's own `SearchTextField` and sends the delegate callback the
  keyboard sends. The field's `search()` is private, so synthesising the callback
  is the only way in; making that method internal is the cleaner upstream change
  and is written down for the pull request rather than done here.

### The launch probe, and what this pilot had to change to make one

`python3 pilots/fsnotes/tests/launch-probe.py --app <FSNotes.app>` launches the built
application, reads one line from its standard output, and reports the registration
state and the named index. It carries the three statements it is not entitled to make
silently, because it does not prove the Siri conversation, does not prove anything
appears in Spotlight, and does not prove the open path selects a notebook.

Three things this pilot forced, which is what the recipe asks a pilot to record:

- **The log is `print`, not a named facility.** FSNotes has no logger the Swift file
  can call, so the line goes to standard output. The HandBrake half reads standard
  error instead, because HandBrake writes through `HBUtilities`. The probe reads
  whichever stream its application writes, and collects both so it can still see why
  a launch produced nothing.
- **Registration happens in `applicationDidFinishLaunching`,** behind
  `if #available(macOS 27.0, *)`. So the probe waits for the line rather than for a
  window, because on an older system the line will never come and a window would
  still appear.
- **The defaults domain is `co.fluder.FSNotes`,** taken from the built app's
  `Info.plist` rather than from the project file, which also holds two iOS bundle
  identifiers and would have sent the probe reading the wrong one.

**The end-to-end launch was not performed on this machine** and is not claimed. The
agent process may not spawn into the Aqua session, and the probe says so and skips
rather than reporting a failure against an adapter it never observed. What is proved
is the part that actually breaks: `tests/probe/test-launch-probe.py` holds the
probe's regular expression against the registration literal read out of the built
`FSNotes.debug.dylib`, so the two sides cannot drift apart silently. That test was
seen failing against a binary built before the adapter logged, and passing after.

Twelve checks. The probe's own decision takes 0.6 s because it refuses early.

**Index removal is wired, and the test that proves it launches FSNotes.**
`bash pilots/fsnotes/tests/run-deletion-tests.sh` compiles the 233 files Xcode
compiles, read from the project file rather than guessed, links the SwiftPM objects
Xcode already built, and runs under an isolated `HOME`. The storage is
`Storage.shared()`, the notebook is a real `Project`, the funnel is the real
`SidebarOutlineView.removeRows`, and the source is the same one the intent handlers
use. No stand-in anywhere in the chain.

That is possible because `removeRows` reads `ViewController.shared()` and returns
early when it is nil, which happens after the storage removal, so a bare
`NSOutlineView` is enough. The isolation is not optional: `Storage` creates a trash
directory in the developer's `Documents` on first use.

The wiring is one call in `removeRows`, because that funnel is the only place a
project leaves `Storage`. It takes the child projects the funnel itself collected,
not the caller's list. The identifier is the checksum of the folder path, so a
rename is a removal and an insertion, which is why the sync also carries a
`reconcile` that drops whatever the source stopped offering. Thirteen checks, and
the red was proven by deleting the call, which fails on exactly one line.

`indexSync` now certifies what it says. The system still reindexes the named index
on demand, and that is now the backstop rather than the whole story.

### Stage 6 and 7, measured

| Fact | Value |
| --- | --- |
| Build | `BUILD SUCCEEDED`, one earlier attempt failed on a missing `AppKit` import |
| Build time | 17.9 s to the first error, the successful rebuild was not timed |
| Warnings from IntentLane files | none; the only warnings are FSNotes' own |
| Actions in the metadata | `OpenNotebook` with the `system.OpenIntent` schema, `SearchNotebooks` with `system.SystemSearchInAppIntent` and `outputFlags 4` |
| Entity in the metadata | `IntentLaneNotebookEntity` |
| App Shortcuts | none registered, as the contract intends |
| Extra actions registered | none |

The build needed the five new sources to be added to the target, which FSNotes'
classic PBXGroup project does not do by itself. `Scripts/add-intentlane-sources.rb`
does it with the `xcodeproj` gem, is idempotent, and was verified by running it
twice. Hand-editing a 304K project file would have been the alternative.

## Not yet done

Two things, and neither is work:

- **The end-to-end launch probe has not been run against a live application.** The
  agent process on this machine may not spawn into the Aqua session, so the probe
  reports what it could observe and skips the rest rather than putting a red mark
  against an adapter it never saw run. The probe's own logic is covered, and the
  contract between the probe and the application is covered against the built binary,
  so the remaining run needs a desktop and nothing else.
- **The campaign has not produced an observed claim,** and that is on purpose. No
  public API sends a phrase to Siri, so a person with a screen is the only way to
  make that claim, and a claim nobody can reproduce is not a claim.
