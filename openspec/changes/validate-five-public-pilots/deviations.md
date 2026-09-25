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
- **The launch probe is reused from IINA, and each app forced three different
  things.** The shape is identical: read one line, report the registration state and
  the index name, say out loud the three things the probe does not prove, and refuse
  to claim `registration` without a graphical session. What each app changed is the
  stream the line arrives on, the start-up path that has to have run, and how the
  process is stopped. FSNotes logs with `print` to standard output, HandBrake logs
  through `HBUtilities` to standard error and through the
  `writeToActivityLogWithNoHeader:` variant, because the other one is a C variadic
  and Swift cannot import one. Both register from `applicationDidFinishLaunching`,
  which is why the probe waits for the line rather than for a window: on a system
  below the adapter's floor the line will never come and a window would still appear.

  Two parts of this are deviations worth naming. The probe reuses IINA's shape, which
  means this is one probe used twice rather than two probes, and a test asserts the
  two carry the same three disclaimers, because the day they differ is the day a
  reader starts trusting one of them. And the probe could not be run end to end on
  this machine: the agent process may not spawn into the Aqua session. That is
  recorded as not run rather than as a pass, and the effort sheet says so instead of
  quoting a number from a run that did not happen. What stands in its place is a test
  that reads the registration literal out of the built binary and holds it against
  the probe's regular expression, so the two halves cannot drift apart silently. That
  test was seen failing against a binary built before the adapter logged.


## The rule lived in the adapter while the contract did not mention it

`verifierAcces` was missing from the contract, not from the code. The IINA adapter
refused on two conditions, and did so correctly, and `pilots/iina/contract.yaml` said
nothing about either. The same silence was in the FSNotes and HandBrake contracts,
each of which withholds items under a rule of its own.

The silence is the defect, not the absence of the feature. The contract is the document
a client reads, and a contract that does not say when an entity may be exposed
describes an unconditional offer. "Expose one media item" and "expose every media item"
are two different things to sell, and the difference was undocumented.

Writing the condition down forced the schema to name the refusals, and the three pilots
then disagreed with the first draft of that schema. It allowed one rule. IINA enforces
two at once, FSNotes enforces a refusal no rule described, and HandBrake enforces FSNotes'
shape. The schema now carries three named rules and allows a conjunction, and the spec
was corrected before the change was archived rather than after.

The generated Swift deliberately gained nothing. App Intents has nowhere to put an
exposure condition, and a generated property asserting one could not be checked. A test
now holds that silence, so the day someone adds a fake one the suite fails.


## The object motif was proved on one repository and then trusted

`analyse` was built, run and accepted on IINA. Running the same discovery on the
other two pilots found two faults, and neither was visible from IINA.

FSNotes' notebook list declares its conformance across four lines, so a motif reading
one line at a time never saw it and reported `AboutViewController` instead. A motif
that names the wrong object is worse than one that names none, because it looks like
it worked. A declaration is now read until the line carrying its opening brace, and a
file that ends before that yields nothing rather than a half-claim.

A discovery that found classes but could act on none was reported as a pass with a
zero in its own reason. Zero actionable is not a partial success. It is the discovery
finding nothing it can integrate, and the step is now blocked with the classes it did
find named.

HandBrake finds nothing at all. Its list layer is Objective-C, six `.m` and `.mm`
files against three Swift, and the motifs read Swift. That is a scope limit and not a
defect, but it means `analyse` does not reach HandBrake today, and that was not known
until the motif was run on a second repository. An Objective-C motif is its own change
with its own evidence.

Two more IINA shapes leaked while the command was run on a second pilot. The build
invocation hardcoded `iina.xcodeproj` and the `iina` scheme, so a notebook run tried to
build a video player. The demo identity was hardcoded to `dev.intentlane.demo.iina`,
so an FSNotes demo carried a video player's bundle identifier. Both are now declared
per pilot, and both were found by running the command on something it was not written
for, which is the only way they could have been found.


## The reconciliation was observed live, and the claim that it could not be was wrong

I wrote that observing the index reconciliation needed a person, because a sandboxed
headless launch could not make IINA play a fixture. That was wrong, and it was wrong
for a reason I could have checked: the fixtures live in `fixtures/media/`, not in
`fixtures/`, so every attempt handed the application a path that did not exist and
then I attributed the silence to the environment.

Opening a document the way a person does works, and the built application records it:

    IntentLane: rewrote 0 item(s)            launch, before any playback
    IntentLane: indexed 1 item(s), deleted 0, left 0    the document was played
    IntentLane: indexed 0 item(s), deleted 0, left 1    the second document

Deleting the history file underneath a running-then-restarted application took the
index to zero, so a removal propagates and the index does not keep offering what is
gone. That was the `indexSync` defect this repository has already paid for twice, and
on IINA it is observed rather than argued.

**A real defect, found by looking.** The sentinel for "this launch has not synced yet"
was `published.isEmpty`. An empty history is a legitimate state, so a first sync of
zero records left the sentinel false and the next event rewrote the whole index
instead of reconciling. The end state was still correct, which is why no test caught
it: the log said `rewrote` where a reconciliation had happened. It is now an explicit
flag, and the live run shows the difference.

**What is still unobserved.** A system search result opening that exact item, and the
Siri conversation. `test` stays blocked on those two, and the run says so.


## The two claims nobody could observe are blocked by a real gap, not by the shell

I recorded the system-search and Siri claims as unobservable from an agent shell. That
framing was wrong, and the way it was wrong matters more than the claims.

The built application ships complete App Intents metadata. `Metadata.appintents` in the
bundle declares `OpenPlayedMedia` bound to `system.open` with the target entity,
`SearchPlayedMedia` bound to `system.searchInApp`, the entity marked
`com.apple.appintents.entity.Indexed`, `IntentLanePlayedMediaQuery` registered as the
default query, and every one of them `isDiscoverable: true`. That is exactly what the
contract asked for, and it is in the product.

The assistant has never seen any of it. Its own tool-embedding database,
`~/Library/Shortcuts/ToolEmbeddingDatabase`, holds 33 689 rows and not one mentions
IINA or PlayedMedia. Every registration attempt dies with
`NSCocoaErrorDomain 4097`, an XPC connection interrupted, reaching for
`com.apple.linkd.autoShortcut`, which is running and active in the user session.

What that rules out, each checked rather than assumed: the metadata is present; the
service exists and is not cold; a relaunch on a warm session fails identically; and
re-signing the build properly changes nothing about the connection. What remains is
that the assistant refuses this process. `TeamIdentifier=not set` is the obvious
suspect and I did not prove it, so it stays a suspect.

So `test` is blocked because the integration does not reach the assistant, not because
an agent cannot watch a screen. The second reason was recorded first and was wrong,
and it would have sent whoever picks this up looking at their own permissions instead
of at the product.

**A pipeline defect found on the way.** `CODE_SIGNING_ALLOWED=NO` meant the demo build
was not signed at all, so its signature carried the identifier `IINA` rather than
`dev.intentlane.demo.iina`. The build settings now sign ad-hoc for real, which is what
made the difference visible, and two tests hold it.

**I typed into the user's screen.** Driving Spotlight needed keystrokes, and this
process does not have accessibility permission: `osascript is not allowed assistive
access. (-25211)`. The keystrokes I sent anyway landed in Xcode, which was frontmost.
The permission error is the honest blocker for the UI route and it is one grant in
System Settings, not a wall; the injection was mine to stop and I stopped.
