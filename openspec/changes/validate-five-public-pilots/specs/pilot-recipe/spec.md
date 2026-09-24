## Purpose

State the pilot method as requirements rather than as prose, so that every pilot
is measured against the same rules and any change to those rules is a visible act
instead of a drift.

The operational document is `../../recipe.md`, versioned and amended by the
pilots. This spec is the normative layer: it says what must be true at each stage.
Where the two disagree, this spec is the requirement and `recipe.md` is the
worked instruction. They were written together and the pilots have kept them in
step.

A stage is defined here from stage 0 to stage 8, because the first two certified
pilots proved that a method which starts at "run the audit" is not a method: the
first thing that varies between applications is whether the application builds at
all.

## ADDED Requirements

### Requirement: A stage finishes when a command exits zero
Every stage SHALL have a command, and SHALL be finished only when that command
exits zero. A stage SHALL NOT be finished because a person read the output and
found it satisfactory.

#### Scenario: A stage has no settling command
- **WHEN** no command can settle a stage
- **THEN** the claim is lowered or the stage is recorded as not automatable, and
      a person is NOT added to the pipeline to approve it

#### Scenario: A person wants to approve a stage
- **WHEN** someone proposes to sign off a stage by reading its output
- **THEN** the run still reports the stage as failed until a command settles it

### Requirement: Stage 0, the repository builds first
Before any audit or any code, the campaign SHALL establish that the repository
produces a running application from a clean checkout, and SHALL record every
prerequisite the project needs that the machine lacks.

#### Scenario: The project has its own build system
- **WHEN** an application's IDE project is fed by another build system
- **THEN** that build runs first, and the order is recorded

#### Scenario: A prerequisite is missing
- **WHEN** a probed tool is absent
- **THEN** the missing tool is named, the pilot is blocked, and installing a
      system dependency stays a decision for the person who owns the machine

#### Scenario: The build cannot be made to work
- **WHEN** the application cannot be built
- **THEN** the pilot is recorded as blocked with the prerequisite named, and the
      parts that happen to compile standalone are NOT certified as a pilot

### Requirement: Stage 1, the baseline is read-only
The audit SHALL run on a pinned revision before any edit to the application, and
the report SHALL record the route, the targets with resolved platforms, the
conditions and the data classification.

#### Scenario: The route claims a platform with no target
- **WHEN** the audit reports a native route for a repository with no target for
      that platform
- **THEN** it is a tool defect and not a finding about the application, and the
      number is re-measured after the tool is fixed

#### Scenario: The audited directory does not exist
- **WHEN** the audit is pointed at a missing path
- **THEN** it refuses and names the path, rather than reporting an empty success

### Requirement: Stage 2, the contract declares only what is honestly supported
The contract SHALL declare the application's real deployment floor for the platform
it targets, SHALL select a surface the application actually has, and SHALL name the
command that settles each claim.

#### Scenario: The application deploys below what the schema needs
- **WHEN** an application deploys to macOS 10.14 and a system schema needs macOS 27
- **THEN** the contract declares `min_macos: "10.14"`, and the availability guard is
      derived from the schema, not from the floor

#### Scenario: The schema has no macOS floor field
- **WHEN** a contract for a macOS-only application cannot state its floor
- **THEN** that is a tool gap to be fixed in the tool, and a pilot is NOT worked
      around by declaring an unrelated platform's version

#### Scenario: The application has no surface for a schema
- **WHEN** an application has no in-app search field and therefore no list to route
      a term into
- **THEN** `system.searchInApp` is not declared, the reason is written in the
      contract, and no substitute behaviour is registered in its place

### Requirement: Stage 3, the generated code is reproducible
The generated output SHALL be regenerable from the contract alone, and
`generate --check` SHALL be able to detect that the output is stale.

#### Scenario: The contract changes
- **WHEN** a contract field changes
- **THEN** `--check` reports the output as stale, and the pilot is not certified
      until the output is regenerated and the check passes

### Requirement: Stage 4, the mapping is split away from the application
The mapping SHALL be split so that the eligibility rules, the resolver and the open
decision live in files that import no application symbol, and the file that speaks
to the application SHALL be excluded from every test compile.

#### Scenario: The split cannot be done
- **WHEN** the mapping cannot be separated from the application
- **THEN** that is a deviation with a reason, and the cost of the alternative is
      recorded

#### Scenario: The application is Objective-C
- **WHEN** the application target contains no Swift
- **THEN** the pilot adds Swift through a bridging header, promotes the exact
      accessors the Swift file needs out of class extensions, sets the Swift build
      settings the target lacks, and converts no existing Objective-C

### Requirement: Stage 5, the negative is a test
Every pilot SHALL record the exact positive and the exact negative as executable
tests. The negative SHALL cover an unknown identifier, a record that is present
but ineligible, and a near miss that must not resolve to a neighbour.

#### Scenario: An ineligible record shares a name with an eligible one
- **WHEN** an encrypted notebook and a plain notebook share a label
- **THEN** opening the ineligible identifier throws, the eligible one is never
      selected instead, and both facts are asserted

### Requirement: Stage 6, the build is the test for the interop file
The file that speaks to the application SHALL be verified by building the real
application, because no standalone compile can prove it.

#### Scenario: The interop file references a private declaration
- **WHEN** an Objective-C app keeps a class, manager or view in a class extension
- **THEN** the build fails until the declaration is promoted to a header, and the
      promotion is listed as a pull-request change rather than pilot scaffolding

#### Scenario: The registration assigns main-actor state
- **WHEN** a registration writes to a main-actor isolated registry
- **THEN** the registering code is itself main-actor isolated, and the application
      calls it inside an availability check

### Requirement: Stage 7, the metadata is extracted and compared
The metadata SHALL be extracted from the generated code, and the comparison SHALL
fail on any action the mapping cannot serve.

#### Scenario: The protocol list is missing
- **WHEN** the metadata processor's protocol list is absent
- **THEN** the processor refuses to run, and the list is a tracked pilot asset
      because it is an input the compiler requires and not derivable from the
      contract

### Requirement: Stage 8, the claim set is certified
`intentlane verify --pilot <manifest> --strict` SHALL exit zero, SHALL report
`certified`, and SHALL name every declared claim. An observed claim SHALL remain
`pending-evidence` until a ledger records it.

#### Scenario: The run certifies
- **WHEN** every deterministic claim of the pilot is settled
- **THEN** the output names each one and exits zero, and says that anything not
      listed is not certified

### Requirement: Every stage is timed
Each stage SHALL have a row in the effort sheet, with the tooling that recorded it.
A stage that was not instrumented SHALL say so.

#### Scenario: A stage predates the sheet
- **WHEN** a stage was run before the effort sheet existed
- **THEN** the row says `not instrumented`, because a remembered number would
      corrupt the sheet the campaign exists to produce

### Requirement: The recipe is amended, not reinterpreted
When a pilot proves a stage was wrong, the recipe SHALL be corrected in place and
the correction SHALL be recorded as a deviation, so the next pilot starts from the
corrected version.

#### Scenario: The recipe names a command that does not exist
- **WHEN** running a recipe step reveals the named option is not real
- **THEN** the recipe is corrected before the pilot is certified, and the mistake is
      recorded rather than quietly worked around
