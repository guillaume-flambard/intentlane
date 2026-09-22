## Purpose

Allow teams to implement one named Apple domain completely rather than emitting partial schema declarations.

## ADDED Requirements

### Requirement: Domain completeness
The system SHALL validate every required entity, enum, parameter, result and companion action before generating a domain schema.

#### Scenario: Missing companion requirement
- **WHEN** a contract omits a required schema companion
- **THEN** validation fails with an actionable diagnostic

### Requirement: Platform evidence
The system SHALL generate a domain only for targets supported by the selected SDK and deployment floor.

#### Scenario: Unsupported target
- **WHEN** a domain is unavailable for the requested target
- **THEN** generation is rejected before Swift output is written
