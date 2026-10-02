## ADDED Requirements

### Requirement: Multiple observations in one ledger

The system SHALL accept a ledger schema `pilot-evidence/1.1` that records an
`observations` list and a `current` observation id, and SHALL read a
`pilot-evidence/1.0` ledger as a single observation. Each observation SHALL carry
its own revision, conditions, journeys, reproduction and optional artifact
references.

#### Scenario: Two observations of the same pilot

- **WHEN** a 1.1 ledger records an earlier observation and a later one
- **THEN** both are preserved, and the ledger reports the one named by `current`

#### Scenario: A 1.0 ledger is still valid

- **WHEN** a 1.0 ledger is validated
- **THEN** it reads as one observation and produces exactly the diagnostics it
  produced before this change

#### Scenario: The current observation is missing

- **WHEN** `current` names an observation the ledger does not record
- **THEN** validation fails with `ILA173` at `current`

#### Scenario: Flat fields beside observations

- **WHEN** a 1.1 ledger carries `revision`, `conditions`, `journeys` or
  `reproduction` at the root as well as `observations`
- **THEN** validation fails with `ILA173`, because which observation owns them is
  ambiguous

### Requirement: The status follows the current observation

The system SHALL compute the ledger status from the current observation alone. A
non-current observation SHALL be preserved and checked for shape, but a failed
layer or reproduction in it SHALL NOT make the ledger unverified.

#### Scenario: Current passes, history failed

- **WHEN** a later observation passes every required layer and its reproduction,
  and an earlier observation failed Siri
- **THEN** the ledger reads verified and the earlier observation is still present

#### Scenario: Current fails, history passed

- **WHEN** the current observation misses a required layer
- **THEN** the ledger reads unverified with `ILA174` at the current observation's
  path, whatever the earlier observation recorded

#### Scenario: History is malformed

- **WHEN** a non-current observation has an unknown layer or an unknown claim id
- **THEN** the ledger reads unverified, because a malformed document cannot be
  trusted about which observation is current
