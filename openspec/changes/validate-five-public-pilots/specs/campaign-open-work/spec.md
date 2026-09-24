## Purpose

List what the campaign still owes, as requirements with their real state, so the
remaining work is visible in one place and nothing is quietly dropped between two
pilots.

This spec is the open-work counterpart of `../../tasks.md`. It does not replace
it: `tasks.md` is the plan, this is the state of each line including the parts
that are blocked, unmeasured, or owned by the person rather than by an agent. Where
a line is done, the spec says what was measured and points at the record.

Two pilots are certified. The offer gate needs three validations in three domains,
so the campaign is one pilot short of being able to price itself.

## ADDED Requirements

### Requirement: Three qualified candidates remain, and one of them may break the method
The campaign SHALL finish Transmission, LuLu and Cyberduck, and SHALL run
Cyberduck last.

#### Scenario: Transmission comes next
- **WHEN** the third pilot starts
- **THEN** it is the second Objective-C target, with many more targets in the
      project, and it tests whether step 4.1's cost was HandBrake-specific

#### Scenario: LuLu follows
- **WHEN** the fourth pilot starts
- **THEN** it is a third Objective-C target and a security application, so its
      sensitivity classification is recorded before any code

#### Scenario: Cyberduck is last
- **WHEN** the fifth pilot starts
- **THEN** it is a thin native shell over a Java application, and the result is
      reported either way, because a stack the method cannot adapt to is itself the
      finding

### Requirement: A pilot that declares a URL scheme it does not register owns registering it
When a contract declares a URL scheme the application does not handle, the pilot
SHALL register the scheme in the application and list it as a change.

#### Scenario: HandBrake declares a scheme it does not declare
- **WHEN** the HandBrake contract names `handbrake`
- **THEN** the plist change is part of the pilot's pull request, or the contract stops
      declaring it, because a contract must not declare a capability the application
      does not have

### Requirement: The launch probe is the missing claim
The pilots certify that the code compiles and that the registration is wired. A
pilot SHALL NOT claim that the running process registers without a launch probe.

#### Scenario: HandBrake has no probe
- **WHEN** the HandBrake pilot is read
- **THEN** it says the registration is unmeasured at runtime, and either a probe is
      built or the claim is left out

#### Scenario: A probe exists for another pilot
- **WHEN** the IINA pilot's registration probe is reused
- **THEN** the reuse is recorded as a deviation, because the two applications
      register differently

### Requirement: Incremental reindexing is not claimed by any pilot yet
Neither certified pilot wires reindexing to its application's create, update and
delete events, and SHALL say so rather than implying mutation hooks exist.

#### Scenario: A record is renamed
- **WHEN** a preset is renamed or a notebook is moved
- **THEN** the index is corrected by the system's on-demand reindex, and the pilot
      does not claim an incremental hook it did not implement

### Requirement: The observed claim happens at most once and is never a gate
At most one pilot SHALL claim `siri-conversation` or `spotlight-ui-result`, with its
ledger, and it SHALL be reported as observed rather than as a campaign gate.

#### Scenario: A buyer asks for a Siri demonstration
- **WHEN** the request arrives
- **THEN** the pilot chosen for it is named with its reason, the runbook is followed
      by a person, and the other pilots are unaffected

#### Scenario: No person is available
- **WHEN** nobody can observe
- **THEN** no pilot claims an observed surface, and the certification stands without
      it

### Requirement: The offer gate is three domains
The campaign SHALL NOT price the offer before three independent, reproducible
validations exist in different business domains, each certified and each with a
deviation row and an effort row.

#### Scenario: The third certification lands
- **WHEN** a third domain is certified
- **THEN** the results document is filled with the pricing range, the deviation
      count and the domain spread, and nothing else

#### Scenario: The domains are not different
- **WHEN** three validations turn out to share a business domain
- **THEN** the gate is not met, and the campaign continues until the spread is real

### Requirement: The recipe becomes version 2
When the pilots are done, the recipe SHALL be amended with everything the five
taught, so a new client starts from version 2.

#### Scenario: A stage was amended by a pilot
- **WHEN** the pilots complete
- **THEN** each amendment is present in the recipe, and the campaign results say how
      many stages never needed amending

### Requirement: Two decisions belong to the person, not to the agent
The push of the product and pilot branches, and the npm publication, SHALL remain
blocked and named until the person decides.

#### Scenario: The public remote would publish commercial material
- **WHEN** the branch range contains material that is not meant to be public
- **THEN** nothing is pushed, the range is stated, and the decision is asked

#### Scenario: npm is not authenticated
- **WHEN** the publication attempt returns an authentication failure
- **THEN** the attempt stops, the failure is recorded, and no credential is
      requested or stored by the agent

### Requirement: The campaign publishes what it did not observe
The closing document SHALL name the claims that stayed unobserved, as a limit of
the method rather than as a missing feature.

#### Scenario: The results are published
- **WHEN** the campaign closes
- **THEN** it names the validated domains, the pricing range, the deviation count,
      and the surfaces no pilot ever observed
