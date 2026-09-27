## Purpose

Faire qu'une preuve dise à quel point elle était contestable, pour que le verdict `blocked`
 IntentLane rend quand il ne peut pas revendiquer une preuve soit une lecture, et non une
convention de rédaction.

## ADDED Requirements

### Requirement: A claim carries its confidence

The schema SHALL represent a claim's confidence as a value between 0 and 1, together with the
distribution that produced it, separate from the verdict. A reader of a `blocked` verdict SHALL be
able to see the distribution that caused it. A claim form that requires a confidence and omits it
SHALL be rejected, with a diagnostic naming the claim and the field.

#### Scenario: A claim declares a confidence and is accepted

- **WHEN** a claim declares `confidence` between 0 and 1 and a non-empty `distribution`
- **THEN** the configuration is valid

#### Scenario: A confidence outside the bounds is rejected

- **WHEN** a claim declares a confidence below 0 or above 1
- **THEN** validation fails rather than clamping the value, because a clamped confidence is not the
  confidence the gate produced

#### Scenario: A missing distribution is rejected

- **WHEN** a claim declares a confidence but no `distribution`
- **THEN** validation fails with a diagnostic naming the claim, because a confidence a reader cannot
  inspect is indistinguishable from an invented one

### Requirement: A pass is derived, never supplied

The verdict SHALL be derived from the agreement between the deterministic command and the
confidence threshold. A claim form that attempts to supply a `pass` without that agreement SHALL
be rejected. No model, local or remote, SHALL produce a `pass` at any confidence.

#### Scenario: Agreement above the threshold yields pass

- **WHEN** the deterministic command agrees and the confidence is at or above the threshold
- **THEN** the verdict is `pass`

#### Scenario: A supplied pass without agreement is rejected

- **WHEN** a claim form carries a `pass` verdict while the deterministic command disagrees
- **THEN** validation fails, because supplying the verdict is exactly the shortcut the derivation
  exists to prevent

#### Scenario: Agreement above the threshold with a disagreeing command yields blocked

- **WHEN** the confidence is at or above the threshold but the deterministic command disagrees
- **THEN** the verdict is `blocked`, because confidence alone never revises a deterministic
  disagreement

### Requirement: The argmax alone never decides

A decision whose confidence is below the threshold SHALL resolve to `blocked` regardless of which
option holds the highest probability. The measured case SHALL be preserved as a test: a distribution
split evenly between two options below the threshold resolves to `blocked`, not to the option with
the plurality.

#### Scenario: An even split below the threshold yields blocked

- **WHEN** the distribution splits the top two options evenly and the confidence is below the
  threshold
- **THEN** the verdict is `blocked` and the distribution is carried into the verdict

#### Scenario: A strong plurality below the threshold still yields blocked

- **WHEN** one option holds a clear majority and the confidence is below the threshold
- **THEN** the verdict is `blocked`, because a strong preference is not a defensible answer

### Requirement: The default gate is deterministic and offline

The default confidence source SHALL be local and SHALL make no network call, so that the gate stays
reproducible offline. A remote confidence source SHALL be optional. When it is unavailable the
verdict SHALL be `blocked` and SHALL say so; it SHALL NOT reroute the claim to another source, and
it SHALL NOT degrade silently to a weaker gate.

#### Scenario: The default run makes no network call

- **WHEN** a claim is evaluated with the default confidence source
- **THEN** no network call is made and the result is reproducible

#### Scenario: An unavailable remote source yields a stated blocked

- **WHEN** a claim is evaluated with a remote confidence source that cannot be reached
- **THEN** the verdict is `blocked` and names the unavailable source, rather than falling back

#### Scenario: No claim is silently rerouted

- **WHEN** a remote confidence source is unavailable
- **THEN** no alternative source is consulted without the verdict naming the switch

### Requirement: Provider types stay outside the domain

The schema and the domain SHALL NOT reference a provider's question, answer, or criteria types. A
provider confidence source SHALL be reached through an adapter interface, and provider types SHALL
NOT appear in the schema. A test SHALL fail if a provider type reaches the schema.

#### Scenario: A provider type in the schema fails the test

- **WHEN** a provider's types are imported by the schema
- **THEN** a test fails, so the coupling cannot land unnoticed

#### Scenario: The domain validates a claim without any provider

- **WHEN** the schema validates a claim
- **THEN** it does so with no provider dependency, which is what makes the default gate offline
