## ADDED Requirements

### Requirement: Generate a customer-owned adapter template

The system SHALL generate a separate Swift adapter template when a caller
requests adapter output for an entity-backed ASRi contract. The template SHALL
define resolver, registration, navigation, and indexing seams without imports
or assumptions about the customer's model types.

#### Scenario: Content app requests an adapter template

- **WHEN** a valid system search/open contract is generated with an adapter
  output path
- **THEN** the generated template names the corresponding entity resolver and
  contains marked methods for identifier lookup, suggestions, navigation,
  index upsert, and index removal

#### Scenario: Customer code already exists

- **WHEN** the requested adapter output path already exists
- **THEN** generation fails without modifying that file unless the caller
  explicitly requests overwrite

### Requirement: Separate ASRi from Shortcuts automation

The system SHALL treat primary Siri AI schemas and Shortcuts-only schemas as
different product surfaces. It SHALL NOT emit or claim App Shortcuts unless the
contract explicitly requests automation.

#### Scenario: Reader-only contract

- **WHEN** a contract uses only the Reader schema domain
- **THEN** audit output classifies it as Shortcuts-only and it cannot satisfy a
  Siri AI evidence claim

### Requirement: Preserve exact entity matching

The generated adapter seam SHALL require the customer to resolve stable entity
identifiers. It SHALL document that a missing requested identifier returns no
entity and never a similarly named fallback entity.

#### Scenario: Invented article title

- **WHEN** the resolver receives an identifier that does not exist
- **THEN** it returns an empty result and does not resolve a different article
