## Purpose

Nommer les couches de preuve qui manquaient, et dire pour chaque revendication ce qui
la prouve, pour que l'exigence soit lisible au lieu d'être déduite.

## ADDED Requirements

### Requirement: The ledger names the Apple 27 evidence layers

The ledger vocabulary SHALL include `metadata`, `runtime`, `query` and `annotations`
alongside the existing layers, in pipeline order. The ledger format version SHALL NOT
change, because a layer the file does not declare was already skipped. An unknown layer
SHALL still be rejected, because a layer nobody defined cannot be satisfied.

#### Scenario: A ledger that declares only the older layers is still valid

- **WHEN** a ledger declares `contract`, `build`, `shortcuts`, `spotlight` and `siri`
- **THEN** validation reports exactly the diagnostics it reported before the vocabulary
  grew, naming no added layer

#### Scenario: A ledger that declares an added layer is accepted

- **WHEN** a journey declares `runtime` and `query` at `pass`
- **THEN** validation reports no diagnostic about those layers

#### Scenario: A layer nobody defined is still rejected

- **WHEN** a journey declares a layer outside the vocabulary
- **THEN** validation fails and names the unknown layer, because an undefined layer
  cannot be evidence

### Requirement: A layer a claim needs can be claimed

Every layer a claim may require SHALL be either globally required or claimable by a
journey. `metadata`, `runtime`, `query` and `annotations` SHALL be claimable. `contract`
and `build` SHALL NOT be claimable, because a journey always holds them.

#### Scenario: A claim requiring the runtime layer can be satisfied

- **WHEN** a claim requires `runtime`
- **THEN** a journey is able to claim `runtime`, so the requirement is reachable

#### Scenario: A journey cannot claim what it always holds

- **WHEN** a journey declares `contract` as claimed
- **THEN** `contract` is not part of the claimable set, so a journey never states that
  the required base is something it chose to claim

### Requirement: A claim declares what proves it

Every claim SHALL declare at least one layer that proves it, and every layer it names
SHALL be one the ledger knows. A claim that declares no layer SHALL be rejected, because
a claim with no stated proof is a claim nobody can satisfy or challenge.

#### Scenario: A claim that declares its proof is accepted

- **WHEN** a claim declares `contract`, `build`, `metadata`, `query` and `spotlight`
- **THEN** the claim is valid

#### Scenario: A claim declaring no layer is rejected

- **WHEN** a claim declares an empty `requires`
- **THEN** validation fails, because a claim with no stated proof can never be settled

#### Scenario: A claim naming an unknown layer is rejected

- **WHEN** a claim requires a layer the ledger does not define
- **THEN** validation fails, because requiring something undefined is unsatisfiable

### Requirement: A claim that needs a person names the layer a person fills

A claim whose evidence is observed SHALL require at least one layer beyond the globally
required pair, because a person is not a command and a claim no command can settle must
name the layer where the human record lands.

#### Scenario: An observed claim that a command alone settles is rejected

- **WHEN** an observed claim requires only `contract` and `build`
- **THEN** validation fails, because those two are command layers and an observed claim
  needs a layer a person writes
