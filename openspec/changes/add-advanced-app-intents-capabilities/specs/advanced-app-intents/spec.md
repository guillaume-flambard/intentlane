## Purpose

Expose advanced Apple capabilities only when their platform, privacy and runtime behavior are tested for a real customer journey.

## ADDED Requirements

### Requirement: Demand-gated package
The system SHALL add an advanced capability only with a documented pilot use case, platform matrix, safety model and positive and negative fixtures.

#### Scenario: Unsupported speculative feature
- **WHEN** no pilot journey requires an advanced capability
- **THEN** the capability remains advisory in audit output and is not generated

### Requirement: Content lifecycle evidence
The system SHALL require lifecycle evidence for indexed, relevant, syncable or transferable entities.

#### Scenario: Indexed private entity
- **WHEN** an entity is indexed
- **THEN** the audit reports indexing, update, deletion and privacy evidence
