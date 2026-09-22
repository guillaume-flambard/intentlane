## Purpose

Prove named App Intents journeys on a real iOS target without treating simulator or Expo Go output as complete native evidence.

## ADDED Requirements

### Requirement: Native iOS evidence
The pilot SHALL use a native development or signed-device build for advertised iOS App Intents behavior.

#### Scenario: Expo candidate
- **WHEN** the candidate uses Expo
- **THEN** the pilot records a native development build and does not use Expo Go as evidence

### Requirement: Cross-platform comparison
The pilot SHALL record availability, permission and execution differences from macOS.

#### Scenario: Completed pilot
- **WHEN** iOS evidence is complete
- **THEN** the ledger contains an explicit macOS versus iOS comparison
