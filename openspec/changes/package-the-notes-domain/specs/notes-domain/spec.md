## Purpose

Le domaine notes est un domaine Siri AI primaire, publie pour les applications
tierces de prise de notes. Le generateur SHALL le produire avec le contrat exact
d'Apple, ou le refuser explicitement, et SHALL distinguer une preuve de generation
d'une preuve vocale.

## ADDED Requirements

### Requirement: Exact schema contract
The system SHALL emit the parameters of a `notes` schema exactly as the Apple
schema contract declares them, including the order, the optionality and the type,
and SHALL NOT accept a contract that reorders or retypes them.

#### Scenario: Append text with its two declared parameters
- **WHEN** a contract declares `notes.appendText` on a native handler
- **THEN** the intent declares `content` and `target` in that order, with
  `AttributedString` and the note entity, and returns the note entity

#### Scenario: Update note cannot carry a body
- **WHEN** a contract declares `notes.updateNote`
- **THEN** the intent declares `target`, `name`, `attachments`, `isPinned` and
  `folder`, and declares no `content` parameter, because the Apple contract has none

### Requirement: Creating is not targeting
The system SHALL treat a schema that creates an object as a distinct shape from a
schema that acts on an existing object, and SHALL refuse a `target` on a creating
schema rather than reuse the search wording.

#### Scenario: Create note without a target
- **WHEN** a contract declares `notes.createNote`
- **THEN** the intent declares no `target`, runs natively with a handler, and the
  refusal message does not describe in-app search

#### Scenario: Target declared on a creating schema
- **WHEN** a contract declares `notes.createNote` together with a `target`
- **THEN** validation fails with IL1401 and names the creating schema

### Requirement: Schema supplied entity properties
The system SHALL emit the properties of a schema-conformed entity from the schema
contract, with their declared types, and SHALL emit an explicit initializer,
because the schema wraps every property in `EntityProperty`, which has no
`init(wrappedValue:)`.

#### Scenario: Note entity with its seven properties
- **WHEN** a contract declares `notes.note`
- **THEN** the entity declares `id`, `name`, `content`, `attachments`, `isPinned`,
  `creationDate`, `modificationDate` and `folder` with the types of the contract, and
  declares an explicit initializer

#### Scenario: Display properties no longer drive a conformed entity
- **WHEN** a contract declares a schema on an entity and names display properties
  that the schema does not declare
- **THEN** validation does not fail on the display properties, because the schema
  owns the property list, and the generated entity still conforms

### Requirement: Resolvable schema entities
The system SHALL require a schema entity used as a parameter to be resolvable, by
conforming to `IndexedEntity`, `UniqueAppEntity` or `TransientAppEntity`, or by
providing a uniquely named `EntityStringQuery` or `IntentValueQuery`, because the
Apple metadata processor refuses a build otherwise.

#### Scenario: Folder entity without a resolvable query
- **WHEN** a contract declares `notes.folder` and gives it only an `EntityQuery`
- **THEN** the audit reports the entity as not resolvable and the build is expected
  to fail with the Apple message naming the four accepted answers

#### Scenario: Nested query types collide
- **WHEN** two schema entities declare a query type with the same name
- **THEN** the names must be distinct, because the metadata processor rejects a
  duplicate persistent identifier

### Requirement: File parameters name a concrete type
The system SHALL emit a `file` parameter with at least one concrete `UTType`
subtype of `public.item`, because the Apple metadata processor rejects
`public.item` itself.

#### Scenario: Attachments parameter
- **WHEN** a schema declares a `file` parameter named `attachments`
- **THEN** the generated parameter names concrete subtypes, never `UTType.item`

### Requirement: Catalyst availability
The system SHALL refuse a schema that Apple does not expose on Mac Catalyst when
the consuming target is Catalyst, because the `notes` domain is unavailable there
and the Expo path is Catalyst.

#### Scenario: Notes schema on a Catalyst target
- **WHEN** a contract declares any `notes` schema on an app whose target includes
  Mac Catalyst
- **THEN** validation fails with IL1401 and names the unavailable platform

### Requirement: Generation proof is not voice proof
The system SHALL grade `G` on the ability to generate, compile and extract the
schema, and SHALL keep the Siri runtime layer as a separate claim, so a blocked
runtime environment never silently lowers or raises a generation grade.

#### Scenario: Enhanced Siri not served
- **WHEN** the enhanced Siri is not served on the machine running the verification
- **THEN** the Siri layer of the capability ledger is `blocked` with the reason, and
  the generation layers keep their own results
