# LuLu pilot

- **Application**: LuLu, a macOS firewall
- **Revision**: `7d2669e`, shallow clone, no submodules, origin set to the real upstream
- **Licence**: GPL-3.0, read from the repository rather than assumed
- **Platform audited**: macOS
- **Fourth pilot, and the first that the toolchain can actually run**: measured,
  not assumed, by `scripts/can-this-build-compile-swift.sh` before a line of the
  pilot was written.

## Why this pilot, chosen by a measurement

Transmission is blocked and cannot receive generated Swift: its application
builds with CMake, and no released CMake compiles Swift against Xcode 27's
`swiftc`, which was proven from a CMake built from source rather than from two
packagings. The campaign needed to know whether that is Transmission's problem or
the method's, and the answer is that it is neither: it is the whole class of
CMake-built applications, so the next pilot has to be chosen on this axis rather
than on the order of a list.

LuLu answers `YES` on both signals, which is the first candidate to do so:

```
project:   xcode-project
toolchain: compiles-Swift
verdict:   YES. Both signals agree.
```

Against Transmission the same script answers `NO`. The app target here is 41
`.m` files and no Swift, so the defect Transmission shares is present, and unlike
Transmission the build can absorb the remedy.

**What the previous pilot's block does to this pilot.** The recipe's second entry
condition required the previous pilot to be certified. Transmission is not, so
that condition was amended rather than ignored, and the amendment is derived from
the reason the condition exists: it exists so that a defect is not left
attributable to the wrong pilot. Transmission's block produced **no finding in an
application at all**, because it is a toolchain limit proven from source, so
there is nothing here to misattribute. A pilot that had stopped on something it
found in the application would still block the next one, and that is the case the
condition was written for.

## The sensitivity classification, before any contract

Task 3.1 is to classify first, so the contract can be adjusted deliberately
rather than discovered later. Read in `LuLu/Shared/Rule.h` and `Rule.m`.

### What a rule is, and the three kinds

A `Rule` is the firewall's decision about one process or endpoint. The class
carries, among others:

- `uuid`, a `NSUUID` string generated once at creation, and `key`
- `name`, the display name
- `path`, the process binary, and `isGlobal` when the path is the wildcard
- `endpointAddr` and `endpointHost`, matched exactly, by regex, or by CIDR
- `action` allow or deny, and `scope` process or endpoint
- `isDisabled`, `expiration`, and `isTemporary`, which the header defines as
  "duration is set to process lifetime (e.g. has a pid)"

So there are three kinds of rule, and they do not share a lifecycle: a permanent
user rule, a rule that expires, and a temporary rule that dies with the process
that caused it.

### What the names may carry, which is the question the classification exists for

**This application's own identifier is a filesystem path.** `generateKey` in
`Rule.m` prefers a code-signing identifier, and falls back to exactly this:

```objc
if(0 == key.length)
{
    key = self.path;
}
```

That is the finding, and it is the reason this pilot is classified separately
from the three before it. A path on a developer's machine carries their user
name, their build directory and their project's name. A `DevID` signing
identity, the other branch, names an **organisation**, which for a client is a
legal entity. Neither belongs in a client report, and the first one is also what
the application itself uses to deduplicate rules.

**Therefore the identifier for this pilot is `uuid` and never `key`**, and this
is not a stylistic preference: `key` is the field the application considers
canonical, so exposing it would export the application's own notion of identity
along with a path.

What each field may carry, and therefore what may be exposed:

| Field | May carry | Verdict |
|---|---|---|
| `uuid` | nothing a person wrote | the identifier |
| `name` | anything the person types, including a client or project name | **not** an identifier, per the rule that already excluded a user preset and a torrent name |
| `path` | user name, build directory, project name | **not exposed** |
| `endpointAddr`, `endpointHost` | internal hostnames, infrastructure, a client's own servers | **not exposed** |
| `csInfo` | the signing organisation, a legal entity | **not exposed** |
| `action` | allow or deny | exposed as the subtitle |
| `isDisabled` | nothing | exposed, and it drives an exposure condition |

The three previous pilots were classified by one field, the person-written name.
LuLu adds a class the method has not met: **fields that name other people's
infrastructure**. A torrent name is the user's own content and a notebook name is
the user's own text, so excluding them is a privacy choice about the user. A
firewall rule's endpoint and path are a record of what the user's machine talked
to and what ran on it, which is a different kind of thing to put in a report
someone else reads.

### The exposure conditions, and the prediction this makes

The three rules the schema offers map onto the three states the code already
tracks, which is why the mapping is not a guess:

- **`source_disabled`**: `isDisabled` exists and `RulesWindowController.m` reads
  it to render a rule in the disabled colour. A disabled rule is the application
  saying it will not act on it, which is a source turned off.
- **`item_not_usable`**: a rule whose `expiration` has passed, or that is
  `isTemporary` and whose process has gone. The rule object is still in memory
  and still in the list, and it can no longer do anything.
- **`item_missing`**: not used. Nothing removes a rule from the application's
  store in a way this pilot has observed, and a condition asserted without an
  observation is a condition that can be wrong.

**What the classification predicts, for task 3.4 to check.** Because the object
is named by `uuid` while the application names it by path, the contract will
have to bind two different identifiers, and the tests will have to prove that a
rule's `uuid` survives a rename of its `name` and a move of its `path`. If the
classification is right, that is where the work is. If the contract turns out to
need something the classification did not anticipate, the classification was
incomplete and it is the classification that has to be amended, not the pilot.

### The object is not chosen here, and why

A rule is the obvious candidate and a block/allow decision is the obvious
action, but both are held back until the entry conditions are applied, because
the object choice should be made knowing the pilot can build at all. What the
classification does settle is the field policy above, and that policy does not
change if the object ends up being a rule or something narrower.

## The entry conditions, applied

### 1. The application builds from a clean checkout

**Met. It was not a block, and I was wrong to call it one.**

The app target copies a prebuilt helper, `LuLu/Binaries/Netiquette.app`, and
that directory is the last line of `.gitignore` with no `Netiquette` directory
and no submodule in the checkout. Read once, that reads as a blocker. It is not:
**a pilot adapts the application**, that is the whole of the method, and a
build step the release process performs by hand is a build step the pilot can
perform. Netiquette is a separate public application,
`objective-see/Netiquette`, so the pilot builds it and places it.

What that took, all of it measured:

- Clone `objective-see/Netiquette` at `7d2669e`'s companion and build it. Its
  `MACOSX_DEPLOYMENT_TARGET` was 10.10 in two places, which I took to 12.0.
- A second deployment target then surfaced at 10.15, four more places, taken to
  12.0. **Xcode 27 reports one offending value per pass**, so a project with two
  different stale targets needs two builds to find both.
- Build signed `CODE_SIGN_IDENTITY="-"`, adhoc, which is what a pilot does.
- Place the built `Netiquette.app` into `LuLu/Binaries/`, which is exactly the
  path the app target reads.

Then LuLu itself:

```
xcodebuild -workspace lulu.xcworkspace -scheme LuLu -configuration Debug \
  CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO build
** BUILD SUCCEEDED **          exit 0
```

Its own `MACOSX_DEPLOYMENT_TARGET = 10.15` in six places was raised to 12.0
first, the same toolchain-forced change Transmission needed at 11.0. This is the
**third pilot whose checked-in project predates the toolchain**, which is now a
pattern rather than three coincidences.

The result is a real application, not a library: `LuLu.app` whose executable is
a Mach-O universal binary for x86_64 and arm64, adhoc-signed, with the
`Netiquette.app` it needs **inside** `Contents/Resources/`, and
`com.objective-see.lulu.extension.systemextension` built alongside it.

**What the adhoc signature does and does not settle.** It settles the build
claim, and the six default claims are all settled by a command. It does not
settle anything observed: a firewall needs its privileged helper and its system
extension, and a run needs the real identity for team `VBG97UB4TA`. So
`siri-conversation` and `spotlight-ui-result` stay unclaimed, which is already
the pilot's configuration, and no claim in the set depends on a signed run.

**A correction I owe the record.** I first wrote this condition as unmet,
"blocked", on the reasoning that a missing prerequisite is the owner's decision.
That reasoning was borrowed from the case of a Homebrew formula, where the
question is only whether to install a package, and it does not transfer to a
prebuilt binary the pilot can produce itself. The recipe asks for a *running*
app, and a pilot that stops because it would have to adapt the application has
stopped before doing the job. The missing Apple Developer identity remains the
owner's, and that one was never mine to touch.

### 2. The previous pilot is certified

**Met, by the amendment, and the amendment is doing real work here.** Transmission
is not certified. It satisfies the amended condition because its block produced no
finding in an application at all: a toolchain limit proven from source, with no
line of LuLu, Transmission or anything else involved. Had Transmission stopped on
something it found in an application, this condition would be unmet and LuLu
would be blocked.

### 3. No known defect from an earlier pilot is unfixed in the reused code

**Met, with one open defect recorded rather than hidden.** The netnewswire
contract's misplaced `confirmation` key is now held as work in flight in
`openspec/changes/migrate-netnewswire-to-the-contract/`, out of `pilots/`, so it
cannot be read as a shipped pilot. No code is reused between the pilots: each
integrates into its own application, and the reused thing is the generator, which
has no open defect from these pilots.

## The object, and the identifier the classification forced

**A firewall rule, identified by its `uuid` and never by its `key`.**

`validate` exits zero and `generate --check` exits zero, and the generated
entity carries exactly three fields:

```swift
struct IntentLaneRuleEntity: AppEntity, IndexedEntity {
  let id: String
  @Property(title: ..., indexingKey: \.title) var name: String
  let action: String?
```

The three `path` occurrences in the generated file are all in the route helper's
URL builder, not in the entity. That was checked rather than assumed, because the
whole point of the classification is that a path must not reach a client report,
and a contract that says so in a comment while the generated struct says
otherwise would be a comment.

**Two objects rejected for reasons in the code.** A blocked connection is over
the moment it ends, nothing persists it, and no identifier survives a restart. A
log entry is a stream of what passed, and an entry has no addressable identity
either. So the rule is the only candidate that has one at all.

**The two surfaces, and the search was verified rather than assumed.** LuLu has a
real in-app search: `RulesWindowController.h:71` declares `filterBox` as an
`NSSearchField` outlet, `windowWillOpen` clears it, and the controller filters
and reloads the table from it. This is the fourth pilot classified on
`system.searchInApp` and the second to keep it. HandBrake lost the same surface
because it has no search field, so the verdict came from the class and not from
the stack, which is the whole point of classifying per application.

**What is deliberately absent.** Enabling or disabling a rule is the obvious
action in a firewall and `isDisabled` is right there in the model. It is also the
most safety-relevant write in the application, so it is the one most worth proving
properly rather than adding while navigation is still being established. Nothing
keyed on `path` or `endpoint` either, because an intent naming a process path
would reintroduce the exact field the identifier was chosen to avoid.

**The URL scheme.** LuLu registers none today, so `url_scheme: lulu` is a task of
this pilot and a line in the pull request, exactly as the HandBrake pilot
established. A contract must not declare a scheme the application does not
handle.

## The generated code is inside the application, and compiled

This is the first pilot to reach the step Transmission could not.

`scripts/add-intentlane-sources.rb` adds the generated file to the app target
with the `xcodeproj` gem, because a classic PBXGroup project does not compile a
file it has not been told about. It is idempotent, and that was verified by
running it twice: the second run reports `added: none` and `nothing to do`. The
FSNotes record names a script for this that no longer exists in the repository,
since that pilot's working copy is gone, so it is written here rather than
copied from a dangling reference.

**It also sets `SWIFT_VERSION`, and that is not an extra.** A target that had no
Swift declares no `SWIFT_VERSION`, and Xcode rejects an empty one the moment a
Swift file joins it: `error: SWIFT_VERSION '' is unsupported`. The HandBrake
record already lists missing Swift build settings as its own deviation, separate
from the missing file, so the script does both. "Add Swift to a target that has
none" is one operation and it recurs for every Objective-C application.

Then the build, adhoc-signed, with the roots separated:

```
** BUILD SUCCEEDED **        exit 0
```

**And the object exists, which is the check that matters.** A build that is told
about a Swift file and never compiles it is exactly what the Transmission
investigation found, and it is why the exit code alone is not accepted here:

```
/tmp/lulu-obj4/.../Objects-normal/arm64/IntentLaneGenerated.o    317.8K
/tmp/lulu-obj4/.../Objects-normal/x86_64/IntentLaneGenerated.o
LuLu.swiftmodule                                                   produced
```

Three independent facts rather than one log line: the exit code is zero, the
Swift object is 317.8 KB in both architectures, and the target produced a
`.swiftmodule`, which only a target containing Swift does.

At this stage the metadata has not been extracted, so nothing claims registration.
This section establishes the build claim, and the stages below it establish the
rest.

## The pattern, and what it actually is

Three pilots in, and one of them was a false pattern, which is worth as much as
the two that are real.

| Pilot | Stopped by | Real? |
|---|---|---|
| Transmission | no released cmake compiles Swift against Xcode 27 | yes, proven from source |
| LuLu | a prebuilt binary the repository did not contain | **no, the pilot builds it** |
| both | a checked-in project older than the toolchain | yes, three times now |

**The honest cost is the stale deployment target, not the missing binaries.** It
appeared in Transmission at 11.0, in LuLu at 10.15 in six places, and in
Netiquette at 10.10 and then 10.15. Xcode 27 accepts 12.0 and up, and it reports
one offending value per build, so a project with two different stale targets
costs two builds to find both. That is a small, bounded, mechanical adaptation,
and a pilot does it.

What is genuinely unbounded so far is one thing: a build system that cannot
compile the language the integration is written in. Transmission's is that, and
no published cmake fixes it, so no adaptation of Transmission is available. A
client whose application builds with cmake is a client this method cannot
deliver on today, and that belongs in the offer's scope, not in a pilot's notes.

**The correction that produced this table.** I first wrote the LuLu condition as
blocked, on the reasoning that a missing prerequisite is the owner's decision. I
borrowed that from the Homebrew case, where the question is only whether to
install a package, and it does not transfer to a binary the pilot can build
itself. The recipe asks for a running application, and a pilot that stops
because adapting the application is work has stopped before doing the job.

## The classification was amended, and it is the classification that was wrong

Task 3.1 said to classify before the contract, and that is what the section above
does. Task 3.4 asks whether the contract needed something the classification did
not anticipate. It needed one thing, and the method says the answer is to amend the
classification rather than the pilot, so here it is.

**What the classification got right.** It scoped `action` as "allow or deny", and
reading the code confirmed the scope rather than widening it. It named the fields
that must not leave the process, and `path` and `key` did not. Its prediction, that
the contract would have to bind two identifiers and that the tests would have to
prove the `uuid` survives a rename and a move, was the right prediction and the
tests are those tests.

**What it got wrong, and how the code said so.** The first version of the contract
declares two exposure conditions and explains, at length, that `item_missing` is
**not** declared because "nothing was observed removing a rule from the
application's store". Then the pilot read `LuLu/Extension/Rules.m` and the reason
was false. The extension removes three kinds of rule on a timer:

- a rule whose path no longer exists, `Rules.m:1692`
- a temporary rule whose process has exited, `Rules.m:1706`
- a rule whose expiration has passed, `Rules.m:1720`

and then calls `[self delete:rule.key rule:rule.uuid]`, `Rules.m:1748`. The removal
is real, and it is keyed by the same `uuid` this contract identifies rules by.

So `item_missing` is now declared. The first version was not cautious, it was
unread: it asserted an absence of observation as if the absence of a reading were
the same thing, which is the failure this campaign exists to remove and which I had
already written down as the reason Transmission's `item_missing` was omitted. Two
pilots in, the same sentence was copied and the code was not read.

**What `item_not_usable` turned out to be, now that both are read together.** Both
declared conditions are true, and of the same rules, at different moments. The
extension's cleanup runs on a timer, so between the moment a rule's expiration
passes and the moment it is deleted, the rule is in the list and can no longer act.
That window is `item_not_usable` and it is real rather than hypothetical. After the
cleanup, the same rule is `item_missing`. Declaring only the second would have
claimed a guarantee the pilot could not keep between launches; declaring only the
first would have claimed a store that never loses anything.

**The third exposure condition, re-read against the spec's own examples.**
`source_disabled` is the specification's "the user switched the source off", and its
example is IINA's history recording, which is a whole-source switch. A disabled
firewall rule is a per-item switch, and it is a different thing: the application
renders the row in the disabled colour rather than dropping it, so the rule stays
listed, stays addressable and stays openable. The pilot keeps it as an entity, and
two tests hold that line: a switched-off rule resolves by name, and it resolves by
uuid. Had it been treated as `item_not_usable` instead, Spotlight would have hidden
something the person can see in their own window, which is the exact inversion the
classification was written to prevent.

## The three suites, and the negative

113 checks in three suites, each written before the file it tests, and each seen
red on the missing file first. The counts are 45, 46 and 22.

| Suite | Checks | What it covers |
|---|---|---|
| `tests/core` | 45 | eligibility, name matching, uuid lookup, the record's field set |
| `tests/integration` | 46 | the resolver, the open path, search routing, the exact negative |
| `tests/index` | 22 | a real named Core Spotlight index, and the reconcile diff |

**The field set is under test, and that is the part this application needed.** The
record is read back with `Mirror` and compared against the six classified fields.
A `path`, a `key`, an `endpoint` or a `csInfo` field added to `RuleRecord` turns
that check red, which is the only way the classification's central rule can be kept
by a test rather than by a comment in a file nobody re-reads. Four further checks
assert that no field is *named* after one of those, and two that no record renders a
home directory or a signing identity even in its debug description.

**The exact negative, in the two halves the recipe asks for.** An identifier that
does not exist resolves to nothing, selects no neighbour and opens nothing, and the
opener is a recording double so "zero times" is measured rather than assumed. The
near-miss half is the one a firewall can get wrong: a target carrying a real rule's
display title and an unknown uuid throws, and the real rule is not selected in its
place. Both are named in the output, so a reader can see which property was tested.

**A homonym, because a firewall will have one.** Two rules can share a name, and a
spoken name cannot say which it means. The fixtures include two rules named
`Google Chrome` with opposite decisions, and the resolver is required to return
both rather than pick one. Picking one would be a guess about a security decision,
and the open path is required to select the right one by uuid even when the titles
are identical.

**One test failed on a contradiction in the test, and the test was what changed.**
The core suite asserted that a switched-off rule is still eligible, then asserted
three lines later that it does not match by name. The implementation matched the
first and the second assertion was wrong. It is recorded here because the failure
mode is the interesting part: a suite that is written to be green will be made green
by whichever side is easier to bend, and only the reason for bending it says whether
the code or the claim was right. In this case the claim had already been decided
twice, in the spec's example and in the application's own rendering, so the test was
the defect.

## The seam, and what it costs to write

`RuleIntegration.swift` is the only IntentLane file that speaks Objective-C, and it
is the only file no test compiles. Three things had to be true before it built, and
none of them is free knowledge:

- **A bridging header.** The app target is Objective-C and App Intents is Swift, so
  the Swift that calls the application needs the application's classes in scope.
  `IntentLane-Bridging-Header.h` imports five LuLu headers and re-declares one
  global, `xpcDaemonClient`, which every LuLu file declares `extern` separately
  rather than in a header of its own. It also declares three of the rules table's
  private methods, because the app's filter is private and calling it is the point.
- **The script grew a second job.** `scripts/add-intentlane-sources.rb` already set
  `SWIFT_VERSION` for a target that had no Swift. It now also sets
  `SWIFT_OBJC_BRIDGING_HEADER` when a `.h` is among the files, and keeps a header
  out of the sources build phase. Two refusals fell out of writing it, and both are
  the kind of thing that is cheaper to refuse than to fix later: a second bridging
  header in one run, and a header already set to a different path.
- **Two Swift logging APIs do not exist.** `os_log_info` and `os_log_with_type` are
  both macros in `os/log.h`, so neither has a symbol to import, and the first build
  failed on each in turn. `Logger` is the Swift-native form. Every value is
  interpolated `privacy: .public`, because an os_log interpolation is private unless
  it says otherwise and a redacted index name would leave the probe unable to
  report the name the system holds. The prefix is a static literal, which is what
  lets a probe grep for one string rather than reassemble a line from fragments,
  and that was checked with `strings` on the built binary.

**The open path had to be reimplemented against the outline, not against the
dictionary.** `-findRowForItem:` walks the outline's own rows and matches on `path`.
The seam does the same and matches on `uuid`. The row number is only meaningful
after the table is rebuilt, so the table is rebuilt first and the correct row is
selected straight after. Each row is an array of rules, because a process-tree rule
is a parent with children, so a uuid anywhere in a row selects that row and a rule
inside a process tree is still reachable.

**The URL scheme is now registered.** The contract declares `lulu`, and a contract
must not declare a scheme the application does not handle, so
`CFBundleURLTypes` is in `LuLu/App/Info.plist` and the built bundle carries it.
Both intents are native and nothing routes through a URL, so the scheme is a
declaration rather than a mechanism, and the line is in the pull request.

## What no test on this application can do, and is not claimed

**There is no deletion suite, and the reason is structural.** A rule leaving
LuLu's store is removed inside the privileged system extension, and the app reaches
the same rules over XPC through `xpcDaemonClient`. No app-side test can make the
extension delete a rule. Both earlier certified pilots each have a deletion suite,
driving the app's real removal path, and their records say why the index suite alone
was not enough: `indexSync` was certified once while a deleted object stayed
searchable.

What this pilot does instead is prove the diff that follows the removal. The index
suite drives a disappearance on the source and checks that the tracked set drops the
uuid, that a **rename** does not, and that a rule switched off does not either, which
is what tells the three apart. That is a real weakening of the indexSync claim
relative to the two pilots before it, and it is recorded as one rather than papered
over: the wiring is verified by review of `Rules.m` and by the reconcile diff, and
the application's own removal is not re-run.

**Two claims stay unclaimed, as in every pilot.** `siri-conversation` and
`spotlight-ui-result` are not in the claim set. No public API sends a phrase to
Siri, and Core Spotlight offers no read-back of a named index, so neither is settled
by a command. The six certified claims are the six a command settles.

**The adhoc signature settles the build and nothing observed.** A firewall needs
its privileged helper and its system extension, and a real run needs the real
identity for team `VBG97UB4TA`. So there is no launch-probe result here, and
`registration` is not claimed. The registration line was checked to exist in the
built binary with `strings`, which is a check on the file and not a run.

## The metadata, and a drift that `generate --check` caught

Metadata extracted with the recipe's two traps observed: the protocol list is an
input and is tracked at `pilots/lulu/protocols.json`, and the processor is reached
through the toolchain path rather than on `PATH`. `version.json` says
`toolsVersion 27A266a`, and `extract.actionsdata` carries `IntentLaneRuleEntity`,
`OpenIntent` with `OpenEntity`, and `SystemSearchInAppIntent`, and nothing else.
Nothing advertises an action the mapping cannot serve, which is the release
blocker the recipe names.

**`verify` failed `generated` on the first run, and the cause was not the contract
amendment.** I amended the contract and assumed the generated file was stale because
of it. It was not: generating from the pre-amendment contract and from the
amended one produces byte-identical Swift, because the exposure rules shape the
*contract* and not the generated entity. The real cause is that the two copies of
the generated file had drifted, the one in `pilots/lulu/out/` and the one inside the
LuLu clone, and only `out/` is compared by `verify`. The clone's copy was correct
and `out/`'s was not, and from here the old content of `out/` is not recoverable
because it was not tracked.

The finding is the check, not the file. `generate --check` had never been run
against `pilots/lulu/out/`, and a gate that is written in `pilot.yaml` but never
executed before the certification run is a gate that has not been tested. That is
the second time in this campaign that a check assumed to have run had not, after the
path relocation that made every suite fail on a file path.

## The result

```
certified: Certified for the declared claims only: contract, generated,
applicationTests, integrationTests, metadata, indexSync. Any claim not listed
here is not certified.
```

Six claims, 113 checks, one build, and the limitations above are part of the
result rather than beside it. `indexSync` is the weakest of the six, for the reason
given above, and a pilot record that hid that would be worth less than the two
certified before it.
