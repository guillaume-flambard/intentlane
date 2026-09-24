## Purpose

Define what a validated pilot is, without a person in the loop, and make the
campaign produce a measurement of repeatability instead of a set of anecdotes.

## ADDED Requirements

### Requirement: A pilot is validated by a certified claim set
A pilot SHALL be validated when `intentlane verify --pilot <manifest> --strict`
reports `certified` for its declared claim set, and the output SHALL name every
claim it covers.

#### Scenario: Certification covers the whole declared set
- **WHEN** a pilot's deterministic claims are all settled
- **THEN** the run reports `certified`, names each claim, and exits zero

#### Scenario: A claim fails
- **WHEN** one application-owned command fails
- **THEN** the run reports `blocked`, names that claim, and exits non-zero under
      `--strict`

#### Scenario: A pilot claims something a command cannot settle
- **WHEN** a pilot declares an observed claim
- **THEN** the run reports `pending-evidence` and names the claim, and it is not
      certified

### Requirement: No pilot depends on a person to be validated
The mandatory proof of a pilot SHALL NOT include an observation of an operating-system
surface, and the campaign SHALL remain executable by one person.

#### Scenario: Full campaign without observation
- **WHEN** every one of the five pilots is run to certification
- **THEN** no step required a spoken phrase or a second tester

#### Scenario: The observed claim is available, not required
- **WHEN** a buyer asks whether Siri works
- **THEN** at most one pilot may claim `siri-conversation`, with its ledger, and
      the claim is reported as observed rather than as a campaign gate

### Requirement: Repeatability is measured, not asserted
The campaign SHALL maintain one versioned recipe and SHALL record, for every pilot,
every point at which the recipe had to be bent.

#### Scenario: A pilot needs a deviation
- **WHEN** a stage cannot follow the recipe as written
- **THEN** the deviation is logged with the stage, what the recipe said, what the
      pilot needed, the reason, and the extra effort

#### Scenario: A pilot needs no deviation
- **WHEN** every stage follows the recipe
- **THEN** the pilot is recorded as conforming, with zero deviations

#### Scenario: The campaign can fail
- **WHEN** the pilots require materially different inventions in the same stage
- **THEN** the results document records that the recipe is not yet a method, and
      that finding is reported alongside the pricing range

### Requirement: Effort is measured per stage
The campaign SHALL record elapsed effort per stage per pilot, so the offer is
priced from data.

#### Scenario: Every pilot reports its stages
- **WHEN** a pilot reaches certification
- **THEN** each of the eight stages has a recorded duration

#### Scenario: Pricing quotes a range
- **WHEN** the offer is written
- **THEN** it quotes a range derived from the recorded durations and names the
      stage that dominates the total

### Requirement: Qualification rejects before code
A candidate SHALL be rejected during qualification when its data cannot be safely
represented or indexed, and the rejection SHALL be recorded.

#### Scenario: Data is not safely representable
- **WHEN** a candidate's sensitive data would have to be exposed as an identifier,
      a title or an indexed attribute
- **THEN** the candidate is rejected, no code is written, and the reason is
      recorded

#### Scenario: A rejection is a valid outcome
- **WHEN** a candidate is rejected
- **THEN** it does not count against the five-candidate set being replaced by a
      qualified candidate, and the reason is published with the results

### Requirement: A claim set may shrink for an application reason
A pilot's declared surfaces MAY be fewer than another pilot's, but only for a
stated reason about the application. A claim set SHALL NOT shrink because of the
application's language, framework or build system, SHALL NOT grow past what a
command proves, and every reduction SHALL be written in the contract.

#### Scenario: The application has no surface for a schema
- **WHEN** an application exposes no in-app search list to route a term into
- **THEN** the pilot does not declare `system.searchInApp`, the contract names the
      application fact, and the six deterministic claims are unchanged

#### Scenario: A substitution would preserve the count
- **WHEN** the only way to keep a declared surface is to behave differently from what
      the surface means
- **THEN** the surface is not declared, because advertising a capability the
      application does not have is worse than declaring one fewer

#### Scenario: The stack is the reason
- **WHEN** a claim is hard to settle only because of the application's language or
      build system
- **THEN** the claim is kept and the work is done, not dropped

### Requirement: The campaign publishes what it did not observe
The closing document SHALL name every surface no pilot ever observed, as a limit of
the method rather than as a missing feature.

#### Scenario: The results are published
- **WHEN** the campaign closes
- **THEN** it names the validated domains, the pricing range, the deviation count,
      and the surfaces that stayed unobserved

### Requirement: Nothing is sent before a local proof
The campaign SHALL NOT contact a maintainer or open a pull request before a local
proof exists for that repository, its licence and contribution rules have been
recorded, and the offer wording has been reviewed.

#### Scenario: Drafts are prepared
- **WHEN** a pilot is certified
- **THEN** maintainer-specific drafts MAY be prepared and SHALL NOT be sent

#### Scenario: A repository forbids it
- **WHEN** a recorded contribution rule forbids the intended change
- **THEN** the pilot stays local and the rule is reported with the results
