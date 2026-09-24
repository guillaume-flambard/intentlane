# Pilot recipe v1

The ASRi integration method, as a sequence of stages that can be run twice on two
different applications and produce the same result. This document is versioned.
Task 5.1 amends it with what the five pilots teach, so a client starts from v2
rather than from v1.

The recipe is the instrument the campaign measures. Every point at which a pilot
had to bend it goes into `deviations.md`, and every stage's cost goes into
`effort.md`. A recipe that is never bent and never costs anything to run is
either a method or it was written after the fact; the deviation log is how we
tell the difference.

## The rule that outranks the stages

A stage is finished when a command exits zero. It is not finished when a person
read the output and felt satisfied. If no command can settle a stage, that is not
a reason to add a person; it is a reason to lower the claim or to record that the
stage cannot be automated.

## Before stage 1

- Read-only audit first. No edit to the application before the baseline exists.
- Isolate the work in a disposable fork or worktree outside this repository.
  Never in `/tmp`; a workspace has already been lost there once.
- Use harmless local fixtures only. No credentials, no user exports, no private
  endpoints.
- Record the revision, the licence, the contribution path, the app target name
  and its language, and whether the repository uses submodules.
- **Know the language of the application target before promising a stage.** Four
  of the five qualified candidates have an Objective-C app target and no Swift at
  all: HandBrake 77 `.m`, LuLu 27, Transmission 81, Cyberduck 6 over a Java
  application. Only FSNotes is Swift. App Intents is Swift, so four pilots need
  step 4.1 and the recipe is only a method if 4.1 is part of it.

## Stage 1, audit

Establish the baseline on the pinned revision, read-only.

```sh
intentlane audit <fork-path> --platform macos --format json > audit-baseline.json
```

- Exit criterion: the command exits zero and the JSON is kept next to the pilot's
  evidence.
- Record from the report: the route, the target list with resolved platforms, the
  conditions, and the data classification.
- A `route: native` with no target for the platform is a bug in the tool, not a
  finding about the app. The tool now refuses that, and the condition is
  `scoped: true` with at least one target for the audited platform.
- If the audit reports a missing directory or refuses to run, fix the path. It no
  longer answers with an empty success.

## Stage 2, contract

Choose the surface before writing code, then declare it.

- A content, folder, project, document or message object uses the universal
  object contract: `AppEntity.id` stable and opaque, a display title, an
  `EntityQuery`, text resolution, indexing, and `OpenIntent(target:)`.
- A safe reversible write is a custom App Intent with the object as a parameter.
- Deletion, sending, publishing, paying and external sharing are high risk and are
  never in a first pilot.
- If no Apple schema fits, do not sell Siri AI. Offer automation or nothing.
- Compare the application's own deployment floor with the floor the schema
  requires. Declare the real one: `min_macos` for a macOS application, `min_ios`
  for an iOS one, or both. The `@available(macOS 27.0, *)` annotation is derived
  from the system schema the contract uses, not from the declared floor, so an
  application that deploys to macOS 10.14 still gets the guard it needs. FSNotes
  deploys to 10.14 and App Intents needs 27, and the generator handles that
  without the contract lying about either number.
- Write `contract.yaml`, then `pilot.yaml`, declaring the claim set and naming
  the command that settles each claim. The default claim set is deterministic and
  excludes `siri-conversation` and `spotlight-ui-result`.

```sh
intentlane claims
intentlane validate --config contract.yaml
```

- Exit criterion: `validate` exits zero and `pilot.yaml` names a command for every
  declared claim.
- A claim without a command is a deviation, not a claim.

## Stage 3, generation

```sh
intentlane validate --config contract.yaml
intentlane generate --config contract.yaml --output <generated-dir> \
  --adapter-output <adapter-file>
intentlane generate --config contract.yaml --output <generated-dir> --check
```

- Exit criterion: `--check` exits zero, which is the proof that the committed
  generated code still matches the contract.
- The generator never guesses where the data lives, who may read it, how to
  navigate, or what may be indexed. Those stay in the client adapter.

## Stage 4, mapping

The only client-specific code. Keep it small, fixture-backed and reversible.

### 4.1 When the app target is not Swift

If the app target is Objective-C, add Swift to it before anything else, because
App Intents is Swift.

- Add at least one Swift file to the app target. Xcode creates the bridging
  header on demand; do not create one by hand first.
- Expose to Swift only the minimum the entity needs: one read function returning
  stable identifiers, titles and one subtitle, and one open function taking an
  identifier. No business rule crosses the boundary.
- Do not convert existing Objective-C. Do not rewrite the model. If the mapping
  needs more than a read, an open and a delete-free refresh, that is a signal the
  chosen object is wrong.
- Verify with a command that the app target still builds, not with a reading of
  the project file.

### 4.2 Split the mapping from the application

- Put the entity, the query, the resolver, the open path and the search routing in
  a file that imports no application symbol.
- Put the application seams in a second file, behind a protocol, with a live
  implementation and a fixture implementation.
- The test target compiles the first file only. The integration tests then run
  without the application binary, which is what makes them fast and deterministic.
- If the split cannot be done, that is a deviation with a reason, and the pilot
  records the cost of the alternative.
- Opening an object may need more than a lookup. If the existing UI hides the
  object until a parent is expanded, expand the ancestors first, through the same
  API the interface uses, and never by setting UI state directly. That branch
  cannot be covered by an automated test when the application has no test target,
  and then the pilot must say so rather than imply it is proven.
- If the application's own entry point for a behaviour is private, call the public
  callback it already listens to, and write down that making the private method
  internal would be the cleaner change for an upstream pull request.
- Index incrementally only if the application exposes its own create, update and
  delete events and the pilot wires them. If it does not, say that the system
  reindexes on demand instead, rather than implying mutation hooks exist.

### 4.3 Indexing

- Index only what the surface needs, and nothing when the user disabled history.
- Reindex on the application's own create, update and delete events. A full
  rewrite reconciliation is acceptable only when the application exposes no
  incremental event.
- A file path never appears in an identifier, a title or a subtitle.
- The identifier's envelope is documented: what it is stable across, and what it
  is not. IINA's `mpvMd5` is stable across runs and across a title change, and
  not across a move or a rename. Say so rather than calling it stable.

## Stage 5, tests

Three suites, and the negative is not optional.

- Contract tests, out of process, for entity resolution and the result shape.
- Integration tests for the resolver, the open path and the search routing, with
  the fixture implementation.
- The exact negative: an identifier that does not exist resolves to nothing,
  selects no neighbour and opens nothing. A near-miss title must not open a
  different object.

```sh
intentlane verify --pilot <pilot.yaml> --app-test <contract-test-command> \
  --integration-test <integration-test-command> --strict
```

- Exit criterion: every command exits zero, and the negative test exists and
  passes.
- Screenshots and observations never replace a test.

## Stage 6, build

- Build the application target with the pinned toolchain, and record the exact
  command, the toolchain build and the result.
- Exit criterion: the build command exits zero. `BUILD SUCCEEDED` is the evidence.
- A build that only succeeds after disabling a warning is a deviation.

## Stage 7, metadata

Compile the generated file alone with const values, then run Apple's metadata
processor over it. Two things are easy to get wrong and both were wrong in v1 the
first time it was run:

- The protocol list is an **input**, not an output. `-const-gather-protocols-list`
  expects a file that already exists, and without both flags the compiler writes
  no `.swiftconstvalues` and the processor refuses to run. The list is not
  derivable from the contract, so it is a pilot asset that must be tracked with
  the pilot, not a scratch file.
- The processor is not on `PATH`. It lives in the toolchain:
  `$(xcode-select -p)/Toolchains/XcodeDefault.xctoolchain/usr/bin/appintentsmetadataprocessor`.
- The source list contains bare file names, not paths, or the processor fails with
  "Unable to find matching source file".

```sh
xcrun --sdk macosx swiftc -target arm64-apple-macos27.0 \
  -sdk "$(xcrun --sdk macosx --show-sdk-path)" -module-name <Module> \
  -emit-const-values -const-gather-protocols-list <pilot>/protocols.json \
  -c IntentLaneGenerated.swift -o IntentLaneGenerated.o
printf 'IntentLaneGenerated.swift\n' > sources.txt
printf 'IntentLaneGenerated.swiftconstvalues\n' > constvals.txt
"$(xcode-select -p)/Toolchains/XcodeDefault.xctoolchain/usr/bin/appintentsmetadataprocessor" \
  --output metadata --toolchain-dir "$(xcode-select -p)/Toolchains/XcodeDefault.xctoolchain" \
  --module-name <Module> --sdk-root "$(xcrun --sdk macosx --show-sdk-path)" \
  --xcode-version 27A266a --platform-family macOS --deployment-target 27.0 \
  --target-triple arm64-apple-macos27.0 --source-file-list sources.txt \
  --swift-const-vals-list constvals.txt --force
```

- Exit criterion: the extracted metadata contains every action and schema the
  contract advertises, and nothing extra was registered.
- Metadata that advertises an action the mapping cannot serve is a release
  blocker.
- The option that hands it to `verify` is `--metadata`, not `--build-metadata`.

## Stage 8, certification

```sh
intentlane verify --pilot <pilot.yaml> --app-test <contract-test-command> \
  --integration-test <integration-test-command> \
  --metadata <extracted-metadata-dir-or-actionsdata> \
  --index-test <index-test-command> --probe <launch-probe-command> --strict
```

- Exit criterion: the output says `certified`, names every declared claim, and
  exits zero. Every claim is one of `pass`, `pending-evidence` or `blocked`, and a
  declared claim cannot be quietly dropped.
- An observed claim is added only on request and stays `pending` until a person
  records it in the ledger:

```sh
intentlane verify --pilot <pilot.yaml> --claim siri-conversation --strict
```

This exits non-zero while the observation is absent, by design. No public API
sends a phrase to Siri, and Core Spotlight offers no read-back of a named index,
so those two claims cannot be certified by a command and are never part of a
default claim set.

## After stage 8

```sh
intentlane audit <fork-path> --platform macos --format json > audit-candidate.json
intentlane audit-diff audit-baseline.json audit-candidate.json --fail-on regression
```

- Exit criterion: the delta holds no regression entry. A regression is a release
  blocker until a person explains it in the deviation log.
- Record the effort for all eight stages in `effort.md`, even when the stage was
  trivial. A stage with no row is a stage nobody measured.
