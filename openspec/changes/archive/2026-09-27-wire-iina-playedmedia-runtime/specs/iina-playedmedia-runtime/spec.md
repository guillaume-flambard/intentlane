## Purpose

Make the IINA pilot operational: its resolver, handlers and Spotlight lifecycle are driven by the
running application, and that fact is observable instead of assumed.

## ADDED Requirements

### Requirement: Launch-time registration
The application SHALL register the `played_media` resolver and the `open_played_media` and
`search_played_media` handlers once at launch, behind a macOS 27 availability guard, so the
generated query and intents stop returning empty results and throwing `missingHandler`.

#### Scenario: Application launches
- **WHEN** IINA starts on macOS 27 or newer
- **THEN** `IntentLaneEntityResolvers.played_media` is non-nil and both intent handlers are registered

#### Scenario: Application launches on an older floor
- **WHEN** IINA starts on a macOS version below 27
- **THEN** no pilot symbol is touched and the application starts unchanged

### Requirement: Observable registration
The application SHALL expose whether the pilot was registered, so a verification run can assert the
wiring instead of inferring it from a passing build.

#### Scenario: Probe after launch
- **WHEN** a runtime probe reads the registration state after launch
- **THEN** it reports registered, and a missing registration fails the probe rather than passing silently

### Requirement: History-driven index lifecycle
The application SHALL index played media only while `recordPlaybackHistory` is enabled, SHALL
refresh the named index when the history changes, and SHALL remove entries that are no longer
available: history cleared, entry deleted, file deleted, or recording disabled.

#### Scenario: A media file is played
- **WHEN** IINA adds an entry to the playback history while recording is enabled
- **THEN** the named index contains an entity for that entry and no other new entry

#### Scenario: The user disables history recording
- **WHEN** `recordPlaybackHistory` is switched off
- **THEN** every previously indexed entity is removed from the named index

#### Scenario: The user clears the history
- **WHEN** IINA clears the playback history
- **THEN** the corresponding entities are removed from the named index

#### Scenario: The local file disappears
- **WHEN** an indexed entry no longer resolves to an existing local file
- **THEN** its entity is removed from the index and it is no longer offered

#### Scenario: The index is purged externally
- **WHEN** the named index no longer contains a previously remembered identifier
- **THEN** the stale set is derived from the index itself, not from application-side bookkeeping

### Requirement: Single privacy rule
The mapping from IINA history to a displayable and indexable record SHALL be written once and
SHALL apply the same privacy rule in resolution and in indexing: the identifier is a hash, the
title is the stored title or the file basename, the subtitle carries no filesystem path, and only
records whose local file exists are offered.

#### Scenario: Resolver and index diverge
- **WHEN** the privacy rule is changed
- **THEN** a single shared implementation feeds both resolution and indexing, so the two cannot drift
