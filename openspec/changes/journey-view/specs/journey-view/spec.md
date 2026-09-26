## Purpose

Rendre lisible ce qu'un journey a démontré, ce qui lui manque et pourquoi il n'est pas
certifié, sans qu'aucune vue ne tranche.

## ADDED Requirements

### Requirement: The validated ledger is readable

Ledger validation SHALL expose the parsed ledger on its result, and SHALL expose it only
when validation produced one. A rejected ledger SHALL expose nothing, so no view can
build a journey from a document that was refused.

#### Scenario: A valid ledger is readable

- **WHEN** validation reports a ledger with no diagnostic
- **THEN** the result carries the parsed ledger and its journeys

#### Scenario: A refused ledger exposes nothing

- **WHEN** validation reports a diagnostic
- **THEN** the result carries no parsed ledger, so a consumer cannot read a journey the
  validator rejected

### Requirement: A journey view decides nothing

The journey view SHALL take the ledger status and the claim outcomes as given, and
SHALL NOT call the derivation itself. A journey SHALL be reported `verified` only when
the ledger is verified, every claim it names is verified, and every layer those claims
require is at `pass`. A journey naming no claim SHALL be reported `unverified`, because
nothing was shown.

#### Scenario: A journey reflects the outcomes it was given

- **WHEN** a named claim's outcome is `pending`
- **THEN** the journey is `unverified` and the reason is the reason the derivation gave,
  not one the view invented

#### Scenario: A journey naming no claim is never verified

- **WHEN** a journey has every layer at `pass` and names no claim
- **THEN** the journey is `unverified`, because a layer status is not a claim

#### Scenario: A journey keeps the ledger reason

- **WHEN** the ledger is unverified because nobody reproduced the pilot
- **THEN** every journey carries that reason, because independent reproduction is not
  satisfied by one journey holding its layers

### Requirement: Required layers come from the claims

A journey's required layers SHALL be the union of the `requires` of the claims it names.
A layer outside the journey's claimed and globally required set SHALL NOT be counted,
because the validator already refuses a journey that names a claim it cannot hold.

#### Scenario: Required layers union the claims

- **WHEN** a journey names two claims requiring `query` between them
- **THEN** the required layers list `query` once

#### Scenario: A layer not at pass is reported unmet

- **WHEN** a required layer sits at `blocked`
- **THEN** the journey reports it unmet and the proof state counts it as unsatisfied

### Requirement: Proof state is information, never a threshold

The view MAY report how many required layers are satisfied. It SHALL NOT use that count
to decide the journey status, and its rendering SHALL say so. A percentage threshold
would be a second contestability rule, separate from the single threshold the claim
confidence owns.

#### Scenario: The proof state is displayed as information

- **WHEN** five of five required layers are at `pass`
- **THEN** the rendering shows the count and states that it is not a verdict
