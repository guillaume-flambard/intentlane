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
