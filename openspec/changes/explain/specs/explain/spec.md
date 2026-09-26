## Purpose

Repondre a « qu'est-ce que cela veut dire, qu'ai-je observe, qu'est-ce qui manque » pour
un sujet du produit, sans rien trancher et sans rien inventer.

## ADDED Requirements

### Requirement: Three subject forms, one structure

`explain` SHALL accept a claim id, a capability id, and a diagnostic code, and SHALL
render every accepted form in the same section structure: what this means, observed,
derived, not proved, required evidence, next proof, and Apple reference. A subject it
cannot resolve SHALL be refused with a message naming the three accepted forms.

#### Scenario: A claim id renders

- **WHEN** `explain` is given a known claim id
- **THEN** it renders every section, using the claim's own title and required layers

#### Scenario: A capability id renders

- **WHEN** `explain` is given a capability in the catalogue
- **THEN** it renders every section, using the record's group, surface, availability,
  companions, evidence kinds and claim level

#### Scenario: A diagnostic code renders

- **WHEN** `explain` is given a code in the closed set
- **THEN** it renders every section, and says the code's meaning is not recorded in a form
  the command can read

#### Scenario: An unknown subject is refused

- **WHEN** `explain` is given something that is none of the three forms
- **THEN** it fails and names the three accepted forms

### Requirement: Explain invents nothing it cannot source

The Apple reference section SHALL state that no link is recorded and SHALL name where a
human reads it, rather than producing a link. `explain` SHALL NOT assert which layer a
person fills, because no data in the repository says so. It SHALL NOT present a layer
status as a claim.

#### Scenario: No Apple link is fabricated

- **WHEN** `explain` renders any subject
- **THEN** the Apple reference section says the information is not recorded and names a
  file to read, and no URL appears

#### Scenario: No person layer is guessed

- **WHEN** `explain` renders any claim
- **THEN** it never states which layer a person fills, and identifies the evidence family
  and who settles the claim instead

#### Scenario: An unverified claim says so

- **WHEN** a claim's outcome is not verified
- **THEN** the not proved section says the claim proves nothing about the application
  today, and does not soften it

### Requirement: Explain judges nothing

`explain` SHALL report the status a derivation produced when it is given one, and SHALL
NOT compute a verdict itself. It SHALL distinguish a claim nobody verified from a claim
the pilot that was read does not claim.

#### Scenario: A settled claim reports the settled status

- **WHEN** `explain` is given a claim whose outcome is verified
- **THEN** the observed section reports the status and the confidence the derivation
  produced, and the not proved section says nothing beyond what the command already proves

#### Scenario: The two kinds of unknown are distinguished

- **WHEN** `explain` is given no outcomes at all
- **THEN** the observed section says no verification has run

- **WHEN** `explain` is given outcomes that do not cover the claim
- **THEN** the observed section says the claim is not part of the pilot that was read

### Requirement: The catalogue states the real availability

The catalogue SHALL record the availability the shipped framework declares for
`AppIntentsTesting`, which is macOS 27 and iOS 27, and a test SHALL pin it. An
availability lower than the framework's makes the audit silent about a real blocker.

#### Scenario: The AppIntentsTesting floor is the framework's floor

- **WHEN** the catalogue record for `proof.app-intents-testing` is read
- **THEN** it requires macOS 27 and iOS 27, and does not share the lower floor of a
  neighbouring record
