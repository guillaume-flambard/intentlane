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
