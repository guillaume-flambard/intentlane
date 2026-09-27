# pilot-access-contract Specification

## Purpose
Make the contract state when an entity may be exposed, so the document a client reads describes
the offer the implementation actually makes.

## Requirements

### Requirement: An entity declares its exposure condition

The configuration schema SHALL require every entity to declare an exposure condition, and SHALL
reject a form that names no rule. An entity that is always exposed is a different offer from one
that is conditional, and a contract that cannot distinguish them describes neither.

#### Scenario: A conditional entity is accepted

- **WHEN** an entity declares `exposure` with a named rule and its required companion settings
- **THEN** the configuration is valid

#### Scenario: An entity with no condition is rejected

- **WHEN** an entity omits `exposure`
- **THEN** validation fails with a diagnostic naming the entity and saying an exposure condition is
  required

#### Scenario: A condition naming no rule is rejected

- **WHEN** an entity declares `exposure` with an empty list, an unknown rule, or the same rule twice
- **THEN** validation fails rather than treating an unreadable condition as "always exposed"

### Requirement: A refusal rule names its own refusal

The schema SHALL distinguish the refusals the implementations actually make, so a contract can say
which one it means. Three exist across the four pilots, and collapsing them would describe an offer
nobody made.

- `source_disabled`: the user switched the source off, as IINA does with history recording.
- `item_missing`: the item is gone, as IINA does with a deleted file.
- `item_not_usable`: the item exists and must not be read, as FSNotes does with an encrypted,
  trashed, virtual or untitled notebook, and as HandBrake does with a built-in, unsupported or
  non-leaf preset.

#### Scenario: One rule is enough

- **WHEN** an entity declares exactly one known rule
- **THEN** the configuration is valid and the rule is preserved verbatim in the parsed document

#### Scenario: More than one rule is allowed

- **WHEN** an entity declares several known rules
- **THEN** the configuration is valid, the order is preserved, and the meaning is a conjunction

#### Scenario: The recording rule is declared

- **WHEN** an entity declares the rule that withholds exposure while the source is switched off
- **THEN** the configuration is valid and the rule is preserved verbatim in the parsed document

#### Scenario: The missing-item rule is declared

- **WHEN** an entity declares the rule that withholds exposure when the underlying item is gone
- **THEN** the configuration is valid and the rule is preserved verbatim in the parsed document

#### Scenario: The condition is reported, not just rejected

- **WHEN** an entity has no readable exposure condition
- **THEN** the diagnostic names the entity and the field, and says why the condition is required,
  because a reader has to act on the message without reading the schema

### Requirement: The report names an entity with no condition

`intentlane validate` SHALL report an entity whose exposure condition is missing or unreadable, so
a pilot cannot ship the unconditional form by not noticing.

#### Scenario: A contract missing the condition is reported

- **WHEN** a configuration is validated and an entity has no readable exposure condition
- **THEN** a diagnostic is produced naming the entity and the required field
