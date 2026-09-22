## Purpose

Prove bounded Siri journeys in public macOS applications without converting a pilot hypothesis into a product claim prematurely.

## ADDED Requirements

### Requirement: NetNewsWire hypothesis validation
The pilot SHALL evaluate NetNewsWire using harmless local RSS data for find a named article, open it, and mark it read.

#### Scenario: Baseline audit
- **WHEN** the isolated NetNewsWire revision is audited
- **THEN** existing shortcuts or intents and missing schema-backed discovery are recorded as evidence, not assumed

### Requirement: FSNotes follow-up validation
The pilot SHALL evaluate FSNotes only after the first pilot ledger is complete, using local data for find, open, and safely append to a note.

#### Scenario: Safe note action
- **WHEN** append is evaluated
- **THEN** confirmation, authentication and failure behavior are documented before implementation

### Requirement: Pilot evidence boundary
The service SHALL not contact maintainers, alter upstream repositories, or describe either pilot as verified until contract, build, Shortcuts, Spotlight when claimed, and Siri evidence pass.

#### Scenario: Incomplete Siri test
- **WHEN** manual Siri evidence is absent or fails
- **THEN** the journey remains an internal hypothesis
