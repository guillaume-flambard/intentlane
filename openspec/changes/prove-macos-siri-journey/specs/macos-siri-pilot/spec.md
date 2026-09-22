## Purpose

Prove that named, schema-backed journeys work end-to-end in a public macOS app under recorded conditions.

## ADDED Requirements

### Requirement: Eligible pilot selection
The pilot SHALL use a public, buildable, legally forkable macOS app with a legitimate schema fit and no production credentials.

#### Scenario: Candidate qualification
- **WHEN** a candidate is selected
- **THEN** its revision, licence, target, deployment floor and schema rationale are recorded

### Requirement: Five-layer evidence
The pilot SHALL retain contract, build, Shortcuts, Spotlight when claimed, and manual Siri evidence for each advertised journey.

#### Scenario: Published journey
- **WHEN** a journey is marked verified
- **THEN** every applicable evidence layer records pass under named macOS 27 conditions
