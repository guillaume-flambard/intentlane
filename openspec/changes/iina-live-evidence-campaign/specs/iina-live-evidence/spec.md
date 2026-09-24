## Purpose

Observe, reproduce and record the IINA pilot's claimed Siri and Spotlight surfaces through people,
so the pilot's status rests on evidence rather than on a green build.

## ADDED Requirements

### Requirement: Local fixtures and seeded history
The campaign SHALL use only local, freely usable media fixtures, played once so that the playback
history contains them, and SHALL never use a real user media library.

#### Scenario: History is populated
- **WHEN** the fixtures have been played
- **THEN** each fixture appears in IINA's playback history and the app is not asked to index anything else

#### Scenario: Title and file name differ
- **WHEN** at least one fixture has a visible title different from its file name
- **THEN** the campaign exercises the divergence between title matching and path matching instead of hiding it

### Requirement: Recorded conditions
Every observation SHALL record the macOS build, the locale, the Siri language, the app build and
the exact phrase or query used.

#### Scenario: Missing condition
- **WHEN** an observation is entered without its conditions
- **THEN** it is rejected as evidence

### Requirement: Spotlight journey observed
A person SHALL observe that a Spotlight search for a fixture's visible title returns a result
attributed to IINA and opens that exact media.

#### Scenario: Result opens the exact media
- **WHEN** the search is run and the result is chosen
- **THEN** IINA opens the fixture that was chosen, not a similarly named one

#### Scenario: Stale index
- **WHEN** a result could come from an earlier run
- **THEN** the campaign records the index condition so the success is attributable

### Requirement: Siri journey observed
A person SHALL observe Siri opening a played item, and SHALL observe the disambiguation prompt when
two items share a visible title.

#### Scenario: Ambiguous title
- **WHEN** Siri is asked to open an item whose visible title matches two entries
- **THEN** Siri asks which one, and the selected entry is the one opened

#### Scenario: Invented title
- **WHEN** Siri is given a title that does not exist
- **THEN** nothing opens and no neighbouring entry is selected

### Requirement: Degraded file is not offered
A person SHALL record that a played item whose local file has been deleted is no longer offered and
no longer opens.

#### Scenario: Deleted file
- **WHEN** a fixture's file is removed
- **THEN** neither Spotlight nor Siri offers it, and an attempted open fails without substitution

### Requirement: Independent reproduction
A second person SHALL replay the accepted flows from a clean state without assistance, and the
results SHALL be entered in the evidence ledger.

#### Scenario: Unreproduced success
- **WHEN** the second tester cannot reproduce a flow
- **THEN** the ledger stays `unverified` and the pilot remains feedback, not a claim

### Requirement: Ledger validation
The campaign SHALL end with `intentlane evidence validate --strict` reporting `verified` before any
claim exceeds the pilot's status.

#### Scenario: Ledger not verified
- **WHEN** strict validation does not report `verified`
- **THEN** no public claim is made and the outstanding reason is recorded
