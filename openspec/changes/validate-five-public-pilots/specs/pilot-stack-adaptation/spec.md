## Purpose

State what "adaptable to every stack" means as a requirement, so the commercial
claim has a definition that a buyer can check and a scope that cannot drift.

Adaptability here is a claim about two things at once: the same certification
across different application stacks, and a predictable cost. The first two pilots
exist to test both halves, and this spec records what they established, what they
proved, and what they deliberately did not claim.

The evidence is in `../../../../../pilots/fsnotes/QUALIFICATION.md` and
`../../../../../pilots/handbrake/QUALIFICATION.md`, and the per-stage costs are in
`../../effort.md`. This spec states the requirement and cites them.

## ADDED Requirements

### Requirement: The claim set is invariant across stacks
Every pilot SHALL certify the same six deterministic claims: `contract`,
`generated`, `applicationTests`, `integrationTests`, `metadata` and `indexSync`.

#### Scenario: A second stack is certified
- **WHEN** a pilot on a different application stack reaches certification
- **THEN** it certifies the same six claims, by the same command, with the same
      meaning for each

#### Scenario: An application cannot support a surface
- **WHEN** an application genuinely lacks a surface a schema would need
- **THEN** the contract declares fewer intents for a stated reason about the
      application, and the six claims are unchanged

### Requirement: A claim set may shrink for an application reason, never a stack reason
A claim set SHALL NOT shrink because of the application language, framework or
build system. It SHALL NOT grow past what a command proves. Every reduction SHALL
be written in the contract with its reason.

#### Scenario: The application has no in-app search
- **WHEN** an application exposes no search field and no list to route a term into
- **THEN** `system.searchInApp` is not declared, the reason names the application
      fact, and no substitute behaviour is registered in its place

#### Scenario: A temptation appears to keep the count
- **WHEN** implementing the missing surface would mean selecting the one record
      that matches and calling that "search"
- **THEN** that is refused, because it would advertise a system surface the
      application does not have

### Requirement: The generated output is invariant to the application
The generator SHALL produce structurally identical code for two applications that
declare the same shapes, differing only in vocabulary: entity name, intent names,
subtitle field and index name.

#### Scenario: Two applications on two stacks
- **WHEN** the FSNotes and HandBrake contracts are generated
- **THEN** the outputs differ only in vocabulary, and the difference is counted
      and published rather than described

### Requirement: The mapping is split the same way on every stack
Every pilot SHALL keep the eligibility rules, the resolver and the open decision in
files that import no application symbol, and SHALL exclude the application-facing
file from every test compile.

#### Scenario: The tests run without the application
- **WHEN** a pilot's suites are executed
- **THEN** no test compiles a line of the application, and the application-facing
      file is absent from the compile line rather than merely unused

### Requirement: The cost of a stack is measured before it is quoted
The campaign SHALL record, per stack family, what the application needed before it
could be integrated, and SHALL price adaptability from those measurements.

#### Scenario: An application needs system prerequisites
- **WHEN** an application's own build system requires tools or toolchain
      components the machine lacks
- **THEN** each one is named, counted and recorded in the effort sheet, and the
      first of them is a decision for the person who owns the machine

#### Scenario: An application is Objective-C
- **WHEN** the application target contains no Swift
- **THEN** the expected costs are recorded and named: a bridging header, promoted
      accessors out of class extensions, two Swift build settings the target did
      not have, and one import of the generated Swift header

### Requirement: The same test-first discipline holds on every stack
The rules SHALL be written from failing tests, and the test counts SHALL be
published per pilot.

#### Scenario: A compiled language needs two reds
- **WHEN** a pilot's rules are implemented
- **THEN** the first run fails on missing types and the second on assertions, and
      only then is the rule written

#### Scenario: A test finds a gap nobody designed
- **WHEN** a suite fails on a case the design did not consider
- **THEN** the rule changes, and the record says the test found it rather than
      that the implementation was wrong

### Requirement: A stack the method cannot adapt to is reported as such
The campaign SHALL name a stack family it cannot adapt to, rather than narrowing
the claim set to hide it.

#### Scenario: The application is a shell over another language
- **WHEN** the application to integrate is a thin native shell over a Java
      application
- **THEN** the pilot is the last one, because that is where the method may not
      apply, and the outcome is reported as a finding either way

### Requirement: No commercial claim exceeds the certified surface
The offer wording SHALL be reviewed against the claims registry, and SHALL NOT name
a system surface that no pilot claimed and no command proved.

#### Scenario: A buyer asks whether Siri works
- **WHEN** the question is asked
- **THEN** the answer names at most one observed pilot with its ledger, and says
      which claims were never observed rather than implying they were
