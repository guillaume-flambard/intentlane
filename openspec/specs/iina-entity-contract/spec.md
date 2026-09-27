# iina-entity-contract Specification

## Purpose
Decide, document and test the two points where the IINA pilot currently diverges from its own
entity contract, before any human evidence is collected.

## Requirements

### Requirement: Documented identifier stability decision
The pilot SHALL use IINA's own `mpvMd5` hash of the canonical media URL, SHALL state that it is
opaque, stable across launches and across a title change and NOT stable across a move or a rename,
and the pilot spec and contract SHALL agree.

#### Scenario: File is moved or renamed
- **WHEN** an indexed media file is moved or renamed
- **THEN** the identifier changes, the previous identifier resolves to nothing, no other item is
      opened in its place, and the next index refresh republishes the item under its new identifier

#### Scenario: Title changes
- **WHEN** the stored title of a media changes
- **THEN** its identifier is unchanged

#### Scenario: Opaque identifier
- **WHEN** an entity identifier is produced
- **THEN** it is non-empty and does not expose the filesystem path in reversible form

#### Scenario: Homonyms stay distinguishable
- **WHEN** two different files resolve to the same visible title
- **THEN** they remain two distinct choices and the system is able to ask which one to open

### Requirement: Documented subtitle decision
The pilot SHALL expose the media kind as the subtitle and SHALL NOT expose the last-played date,
with the freshness rationale recorded in the pilot spec.

#### Scenario: Subtitle content is fixed
- **WHEN** an entity is presented by the system
- **THEN** its subtitle is the media kind and contains no filesystem path and no date

#### Scenario: Replaying the same media
- **WHEN** the same media is played again later
- **THEN** the subtitle is unchanged, so the Spotlight record is not made mutable by a replay

#### Scenario: One decision, one place
- **WHEN** a record becomes an entity
- **THEN** the subtitle is produced by the single tested core rule, not by an inline expression

### Requirement: Regression protection
The chosen identifier and subtitle rules SHALL be protected by tests that fail if a later change
alters them.

#### Scenario: Regression attempt
- **WHEN** a change makes the identifier path-derived or the subtitle exceed the decided fields
- **THEN** the suite fails
