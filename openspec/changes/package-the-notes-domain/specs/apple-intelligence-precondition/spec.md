## Purpose

Une experience de routage vocal n'est interpretable que si le systeme peut
router. Le depot SHALL verifier cette precondition avant qu'un echec soit lu
comme un resultat de plateforme.

## ADDED Requirements

### Requirement: Enhanced Siri precondition
The system SHALL report the service state of the enhanced Siri, read from the
waitlist state of the machine, and SHALL report it as a precondition distinct from
every other check, because an unserved machine cannot route to any App Intent
whatever the quality of the implementation.

#### Scenario: Machine enqueued
- **WHEN** the waitlist state lists `ai.enhanced-siri` with a status that is not
  granted
- **THEN** the report states that Siri routing evidence is not testable, and names
  the status it read

#### Scenario: Machine granted
- **WHEN** the feature does not appear in any waitlist entry
- **THEN** the report states that schema-backed Siri evidence is testable

#### Scenario: State unreadable
- **WHEN** the waitlist preference is absent or malformed
- **THEN** the report states `unknown` and does not conclude either way

### Requirement: On-device model is not a routing precondition
The system SHALL keep the availability of the on-device language model separate
from the routing precondition, and SHALL warn when the two disagree, because a
model that runs does not imply that Siri routes actions.

#### Scenario: Model available while routing is blocked
- **WHEN** the on-device model reports available and the enhanced Siri is not served
- **THEN** the report states that a failing intent observation is explained by the
  routing state and carries no information about the schema

#### Scenario: Model probe not run
- **WHEN** the caller did not ask for a model probe
- **THEN** the report states that the model was not probed, and does not infer
  anything from it

### Requirement: Record the environment with the observation
The system SHALL report the OS version, the SDK version, the Siri language and
the secondary locales alongside any routing observation, so a result can be
reproduced or explicitly declared environment dependent.

#### Scenario: Reporting the environment
- **WHEN** the report runs on macOS
- **THEN** it includes the OS version, the SDK version and the configured Siri
  languages, and marks unavailable values rather than omitting them
