## Purpose

Enregistrer ce qu'un système vivant a réellement fait, sans le juger, pour que la
certification puisse s'appuyer sur des constats au lieu d'hypothèses.

## ADDED Requirements

### Requirement: A probe manifest declares what to observe

The configuration schema SHALL require a probe manifest to declare a version and at
least one probe. Each probe SHALL declare an `id`, the `question` it answers, the
`command` that answers it, and a `format` describing how to read that command's
output. A probe that names no question SHALL be rejected, because a probe that does
not say what it is trying to learn cannot be read later by a person.

#### Scenario: A probe with a question is accepted

- **WHEN** a probe declares `id`, `question`, `command` and `format`
- **THEN** the manifest is valid

#### Scenario: A probe naming no question is rejected

- **WHEN** a probe omits `question`
- **THEN** validation fails and points at the probe, because an unlabelled observation
  is unreadable to anyone but the person who wrote the probe

#### Scenario: A manifest with no probe is rejected

- **WHEN** the manifest declares an empty `probes` list
- **THEN** validation fails, because a manifest that observes nothing is not an
  observation

### Requirement: An observation never carries a verdict

An observation SHALL NOT carry a `pass`, a `fail` or any verdict field. When a probe
prints the text `PASS`, the observation SHALL record that text as its detail and
SHALL NOT record a pass. No observation SHALL be promoted to a claim by this
command.

#### Scenario: A probe that prints PASS is recorded as text

- **WHEN** a probe exits zero and prints `PASS registration`
- **THEN** the observation detail is the text `PASS registration` and the observation
  carries no verdict

#### Scenario: No observation is promoted to a claim

- **WHEN** every declared probe exits zero
- **THEN** no claim is certified by this command, because judgement belongs to the
  derivation and not to the recorder

### Requirement: A probe that cannot run is recorded, not dropped

A probe that cannot be executed SHALL produce an `unavailable` observation with a
confidence of 0, and that observation SHALL appear in the report. A probe that
executed and reported a negative result SHALL produce an `absent` observation. The
two SHALL be distinguishable, because the absence of an observation is not an
observation of absence.

#### Scenario: A probe that cannot run is recorded as unavailable

- **WHEN** a declared probe cannot be executed
- **THEN** the report contains an `unavailable` observation for it with a confidence
  of 0, and the probe is not silently omitted

#### Scenario: A negative result and a missing result differ

- **WHEN** one probe exits non-zero and another cannot run
- **THEN** the first is `absent` and the second is `unavailable`, and the report
  distinguishes them

### Requirement: Every observation carries the command that produced it

Every observation SHALL carry the exact command, its exit status, and its confidence
with the distribution that produced it. A reader SHALL be able to reproduce an
observation from the report alone.

#### Scenario: An observation is reproducible from the report

- **WHEN** a probe has run
- **THEN** its observation carries the command string, the exit status, and a
  confidence with a distribution

#### Scenario: A text probe's confidence comes from the exit status alone

- **WHEN** a text probe exits zero
- **THEN** its confidence is 1 with a single-option distribution, and the value is
  derived from the exit status and not from anything the probe printed

### Requirement: Confidence reuses the claim confidence shape

An observation's confidence SHALL use the same shape as a claim's confidence, a value
between 0 and 1 together with the distribution that produced it, so that one rule
governs contestability across the product. A provider's confidence type SHALL NOT
appear in the schema, and a test SHALL fail if one does.

#### Scenario: A structured probe may state its own confidence

- **WHEN** a json probe emits an observation with a confidence and its distribution
- **THEN** the report carries that confidence after validating it against the same
  shape the claim confidence uses

#### Scenario: A structured probe reporting an unreadable confidence is recorded as unreadable

- **WHEN** a json probe emits a confidence outside the unit interval, or with no
  distribution
- **THEN** the observation is recorded as `unreadable` with a confidence of 0, and
  the report keeps the raw text
