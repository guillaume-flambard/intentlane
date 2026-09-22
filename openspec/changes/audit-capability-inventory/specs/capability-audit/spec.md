## Purpose

Permettre à une équipe de connaître, sans modifier son dépôt, les parcours Apple système réellement disponibles et leurs preuves.

## ADDED Requirements

### Requirement: Read-only audit report
The system SHALL analyse a local project without modifying files in the audited directory and SHALL emit a deterministic report.

#### Scenario: Audit of an unchanged project
- **WHEN** a user runs `intentlane audit` on a supported project
- **THEN** the report is produced and the project worktree is unchanged

### Requirement: Platform-aware capability classification
The system SHALL classify every inspected capability as unsupported, unknown, detected, implemented, tested, or feasible for each target platform.

#### Scenario: iOS-only API on macOS target
- **WHEN** the project requests macOS and only an iOS API is available
- **THEN** the report marks that capability unsupported for macOS

### Requirement: Siri claim boundary
The system SHALL not classify generic App Shortcuts as schema-backed Siri or Apple Intelligence discovery.

#### Scenario: Shortcuts-only implementation
- **WHEN** an app has AppShortcutsProvider but no required schema evidence
- **THEN** the report labels Shortcuts implemented and Siri discovery unknown or detected

### Requirement: Compatibility score
The system SHALL score every report deterministically and SHALL state whether the evidence is schema-backed, shortcuts-only or absent.

#### Scenario: Shortcuts without schema evidence
- **WHEN** a project implements the Shortcuts surface but no schema capability
- **THEN** the score names its band and reports shortcuts-only discovery

#### Scenario: Capability the platform does not ship
- **WHEN** a capability is unavailable on the target platform
- **THEN** it is left out of the score denominator instead of lowering the score

### Requirement: Integration route qualification
The system SHALL state whether the project is native, bridged, ineligible or unknown, and SHALL back that route with evidence.

#### Scenario: Cross-platform app without a generated native target
- **WHEN** the project carries a cross-platform marker but no native target yet
- **THEN** the route is bridged with medium confidence

#### Scenario: Web-only project
- **WHEN** the project has neither a native target nor a bridge marker
- **THEN** the route is ineligible and the report explains that App Intents need a native target or a bridge

### Requirement: Indexed data classification
The system SHALL name the data classes it can see in the declared properties and SHALL report whether the project ships a privacy manifest when it indexes entities.

#### Scenario: Indexed entities without a privacy manifest
- **WHEN** the project conforms an entity to IndexedEntity and ships no PrivacyInfo.xcprivacy
- **THEN** the report states the missing manifest and asks for one

#### Scenario: Sensitive and personal properties
- **WHEN** declared property names match a sensitive or a personal signal
- **THEN** both classes are reported in the published class order, each citing the file and the line it came from

### Requirement: Data architecture qualification
The system SHALL state whether the project resolves its content locally, through a sync, through a remote service, or through nothing it can recognize.

#### Scenario: Local store and a network client
- **WHEN** the project declares a local store and a network client
- **THEN** the architecture is local, because the store is what a Siri journey resolves against

#### Scenario: Nothing recognizable
- **WHEN** no store, sync or network signal is found
- **THEN** the architecture is unknown with the confidence the collected evidence allows

### Requirement: Capability test conditions
The system SHALL record the conditions a capability test depends on, and SHALL name the ones a person still has to confirm.

#### Scenario: A machine that answers for itself
- **WHEN** the audit runs where the operating system, the toolchain and the locale can be read
- **THEN** the operating system version, the Xcode version, the architecture, the locale and the region are recorded

#### Scenario: Conditions only a person can confirm
- **WHEN** the conditions a machine cannot prove are still open
- **THEN** the Apple Intelligence hardware, the signed-in account, the granted permissions and the test data are named as unknown, so a Siri result cannot be attributed to the client code without them

### Requirement: Action quality signals
The system SHALL report the action surfaces it can see in the sources and SHALL flag a shortcut phrase that cannot be registered.

#### Scenario: A complete action
- **WHEN** an intent returns a result, shows a view, registers a shortcut and carries the applicationName placeholder
- **THEN** every signal is reported with the file and the line it came from

#### Scenario: A phrase without the placeholder
- **WHEN** a shortcut phrase omits the applicationName placeholder
- **THEN** the report raises an issue, because the system does not register that phrase

### Requirement: Catalogue version against the installed SDK
The system SHALL report the version of the capability catalogue it used and SHALL compare it with the inspected SDK.

#### Scenario: An SDK newer than the catalogue
- **WHEN** the inspected SDK is newer than the catalogue was derived from
- **THEN** the report asks for a refresh before a capability the newer SDK may ship is trusted

#### Scenario: No SDK inspected
- **WHEN** the audit runs without an SDK path
- **THEN** the catalogue state stays unknown and the report says how to compare it

### Requirement: Both platforms in one run
The system SHALL accept `both` as a platform selection and SHALL emit one complete report per platform, without changing the single-platform output.

#### Scenario: JSON output for both platforms
- **WHEN** the audit runs with `--platform both` and the JSON format
- **THEN** the document is a `reports` collection holding two complete reports, macOS first

#### Scenario: Single platform output is unchanged
- **WHEN** the audit runs with `--platform macos` or `--platform ios`
- **THEN** the JSON document is a single report, exactly as before

### Requirement: Target-scoped capability evidence
The system SHALL scope the evidence of every capability to the Xcode targets that compile for the requested platform, and SHALL report the targets it inspected.

#### Scenario: An intent only the iOS target compiles
- **WHEN** the project requests macOS and the only App Intent is compiled by an iOS target
- **THEN** the report does not mark the App Intent capability implemented for macOS, while the iOS report still does

#### Scenario: Platform read from the build configuration
- **WHEN** the project keeps its build settings in `.xcconfig` files
- **THEN** the system follows the configuration includes to read the platform, and expands the synchronized folders a target compiles

#### Scenario: A file no target owns
- **WHEN** a Swift file belongs to no target
- **THEN** the report still inspects it, because its platform is ambiguous

### Requirement: Protocol-backed schema evidence
The system SHALL report a declared App Schema conformance as implemented, and SHALL distinguish it from a plain declaration that lacks the companions, parameters, result or execution path the schema requires.

#### Scenario: An intent conformed to a protocol-backed schema
- **WHEN** the project declares an intent conformed to a schema whose shape the generator emits, with its target entity resolvable
- **THEN** the schema capability is implemented and the audit names the entity it resolves against

#### Scenario: A declaration without its shape
- **WHEN** the project declares a schema conformance but the required companions, parameters, result or execution path are missing
- **THEN** the capability stays detected and the report names what is missing instead of calling it implemented
