# Deviation log

One row per point where a pilot could not follow `recipe.md` as written. This is
the measurement instrument for repeatability: five pilots that each needed a
different invention mean the recipe is not yet a method, and that is the finding,
not a failure of the pilot.

A deviation is recorded when the stage had to be done differently, when the
recipe's command could not settle the stage, or when the recipe turned out to be
ambiguous. It is not recorded for a stage that simply took longer.

## Format

| Field | Meaning |
| --- | --- |
| Pilot | Application name, with the pinned revision |
| Stage | The stage number and name from the recipe |
| Recipe said | What v1 instructs, quoted closely enough to identify |
| This pilot needed | What was actually done |
| Why | The reason, in terms of the application or the platform |
| Extra effort | Minutes beyond the recipe, with how they were measured |
| Consequence | What this says about the recipe: keep, amend, or cannot automate |

## Log

| Pilot | Stage | Recipe said | This pilot needed | Why | Extra effort | Consequence |
| --- | --- | --- | --- | --- | --- | --- |
| HandBrake `1255087` | 0, build the repository | Audit, then build the app target | Six Homebrew packages, one 839 MB Xcode component, one stale-directory cleanup and one remote correction before it would build | The Xcode project's `external` target is fed by HandBrake's own autotools build, its core compiles Metal shaders, and its deployment target is below the range Xcode 27 supports | 6 packages, 87 s of download, then BUILD SUCCEEDED | amend: recipe v1 gained stage 0, and the cost is now measured rather than guessed |
| HandBrake `1255087` | 2, contract | Declare the same surfaces as FSNotes, because the claim set must not move with the stack | Declared only `system.open`; `system.searchInApp` was removed after reading the app | HandBrake's presets view has an `NSTreeController` and no search field, so there is no in-app search list to route a term into | 0, and the integration suite lost 9 checks with it | keep, with a rule change: a claim set may shrink for a stated reason about the application, never for a reason about the stack |
| HandBrake `1255087` | 4.1, mapping | Map the client object in Swift | Needed a bridging header, three properties promoted out of class extensions, two build settings and one import of the generated Swift header | An Objective-C app keeps its controllers, managers and views in class extensions Swift cannot see, and the target had no Swift at all | 2 failed builds, then BUILD SUCCEEDED | amend: recipe v1 now says to expect promoted accessors, a bridging header, missing Swift build settings and the `-Swift.h` import |
| FSNotes `a96b9b5` | 1, audit | Audit the pinned revision and keep the JSON | Re-audit after two tool fixes, then re-measure | The first classification used a tool that missed an inherited SDKROOT and could claim a native route with no target | 0, already spent fixing the tool | keep |
| FSNotes `a96b9b5` | 2, contract | Declare the app with its real deployment floor | **Fixed in the tool after this pilot found it.** Declared a meaningless `min_ios` first, then `min_macos: "10.14"` | The contract schema had no macOS floor and rejected unknown app keys, so `min_ios` was mandatory | 0 | closed: the schema now takes `min_macos`, and the generator derives the availability annotation from the system schema rather than from a floor |
| FSNotes `a96b9b5` | 4, mapping | Map the client object | Split into four files, with one that imports FSNotes and is excluded from every test compile | The app's seams are `Project`, `Storage`, `ViewController` and the sidebar, so the split is what makes the rest testable | not measured separately | keep: this is the recipe working as written |
| FSNotes `a96b9b5` | 4, mapping | Map the client object | Did not wire incremental reindexing on create, rename and delete | FSNotes exposes the events but a first pilot should not add five mutation hooks to an app it does not own | 0, deliberately not done | amend: recipe now says the system reindexes on demand and to say so plainly |
| FSNotes `a96b9b5` | 4, mapping | Route the existing in-app search | Synthesised the search field's delegate callback | The field's `search()` is private | small, not measured | keep, and write down that making `search()` internal is the cleaner upstream change |
| FSNotes `a96b9b5` | 4, mapping | Open the object through the existing router | Expand ancestors with `expandItem` before selecting the row | A nested folder has no row while its parent is collapsed | not measured | amend: record that this branch is unverified by a test, because the app has no macOS test target |
| FSNotes `a96b9b5` | 6, build | Build the app target | Added five sources to the target with a script | FSNotes uses classic PBXGroups, so a new file is invisible to the build until the project names it | small, not measured | keep: `Scripts/add-intentlane-sources.rb`, idempotent |
| FSNotes `a96b9b5` | 7, metadata | Run the metadata processor | Had to supply a protocol list and the full toolchain path | The list is an input the compiler requires and the processor is not on `PATH` | 1 failure round, then success | amend: recipe v1 corrected on both points and the list is now a tracked pilot asset |
| FSNotes `a96b9b5` | 8, certification | `verify --strict` certifies the declared set | Passed on the first run of the corrected command | v1 named a `--build-metadata` option that does not exist; the real one is `--metadata` | 0 | amend: recipe v1 corrected |
| FSNotes `a96b9b5` | 5, tests | Contract, integration and the exact negative | 63 checks in three suites, written before the implementation in two red steps | Test-first and a compiled language need two reds: missing types, then failing assertions | not measured separately | keep |
| HandBrake `1255087` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 77 `.m` files and no Swift; App Intents is Swift | not measured, pilot not started | amend: 4.1 is mandatory for 4 of 5 candidates |
| LuLu `7d2669e` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 27 `.m` files and no Swift | not measured, pilot not started | amend: same as HandBrake |
| Transmission `48835c6` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 81 `.m` files and no Swift | not measured, pilot not started | amend: same as HandBrake |
| Cyberduck `fc0d437` | 4.1, mapping | Map the client object in Swift | Requires Swift in a thin Objective-C shell over a Java application | The Xcode app target is 6 `.m` files; the application itself is Java | not measured, pilot not started | escalate: the recipe may not apply to a Java application |

## Notes on the entries already recorded

- The FSNotes stage 1 entry is a real deviation, and an unusual one: the recipe
  was followed exactly, and the measurement instrument was wrong. The audit
  misread an inherited SDKROOT, so the qualification was re-run on a fixed tool.
  It is logged because a pilot that is reclassified for any reason is a pilot
  whose first number cannot be trusted.
- The four 4.1 entries are recorded before the pilots start, which is not how
  this log is meant to be used. They are here because the measurement is already
  made: the language of each app target is known from stage 1. The effort column
  stays empty until the stage actually runs, because an estimate recorded as a
  measurement would corrupt the sheet this campaign exists to produce.
- The stage 2 floor row is now **closed rather than amended**. The pilot found a
  real gap, the tool fixed it, and the contract now declares `min_macos: "10.14"`,
  which is what FSNotes actually deploys to. Closing a deviation by changing the
  tool is the outcome the campaign wants: the recipe is supposed to get easier
  with each pilot, and this one is easier for the next four.
- **The recipe and the capability spec contradicted each other, and the pilots
  followed the wrong one.** `recipe.md` 4.3 has always said to reindex on the
  application's own create, update and delete events, and a full rewrite is
  acceptable only when the application exposes no incremental event. The
  `pilot-index-lifecycle` spec said a pilot MAY wire them and SHALL NOT be required
  to. Both statements cannot be true, and when the first two pilots were written the
  two files were both open, so the weaker one won by default: `indexSync` was
  certified against the index API, which proves the lifecycle and not the wiring, and
  both pilots shipped a deleted object that stayed searchable. FSNotes and HandBrake
  both expose the event, so the recipe's exception did not apply and neither pilot
  had a reason to take it.

  The fix is not to the pilots, it is to the contradiction. The spec now says the
  test must reach the application's own path, or the pilot record must say the
  wiring was verified by review and by the launch probe instead of implying a
  coverage it does not have. What the spec must not say again is that the hook is
  optional while the recipe requires it, because that is how two honest documents
  produce an uncertified claim.

  The cost is in the effort sheet under stage W: 138 s per run for FSNotes and 10 s
  for HandBrake. The fourteen-fold gap is the language, not the method, and it
  matters for the offer, because a Swift pilot pays for a real-object test and an
  Objective-C pilot does not.
- FSNotes needed its test harness to launch the real application, and that needed an
  isolated `HOME`. `Storage.shared()` creates a trash directory inside the
  developer's `Documents` on first use, so a test that touches the real model also
  writes to the developer's disk. This is recorded rather than fixed because the
  behaviour belongs to the application, not to the pilot, and upstream will not want
  a test-only `HOME`. A pilot on a Swift app that keeps user state in a singleton has
  to budget for this, and the recipe now asks.
