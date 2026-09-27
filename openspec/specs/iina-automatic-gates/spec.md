# iina-automatic-gates Specification

## Purpose
Turn the two remaining helper-level automatic gates into executable proof against the real
playback and index seams, and make the verification gate say what it covers.

## Requirements

### Requirement: Testable playback seam
The open handler SHALL reach IINA's playback through a single seam whose production implementation
forwards to `PlayerCore.activeOrNew.openURL`, so the behaviour can be asserted without a player.

#### Scenario: Production path unchanged
- **WHEN** the application opens a resolved media item
- **THEN** the call reaches `PlayerCore.activeOrNew.openURL` on the main actor, as the History window does

### Requirement: Open accepts only a valid resolved record
The open path SHALL call the playback seam exactly once for a resolved record whose local file
exists, and SHALL refuse, with zero calls, an unknown identifier, a deleted file, or a disabled
history recording.

#### Scenario: Valid record
- **WHEN** a resolved, still-existing record is opened
- **THEN** the seam is called exactly once with that record's URL

#### Scenario: Unknown identifier
- **WHEN** an identifier that matches no history entry is opened
- **THEN** the seam is not called and the open fails

#### Scenario: Deleted file
- **WHEN** a record whose local file no longer exists is opened
- **THEN** the seam is not called and the open fails; no other record is substituted

#### Scenario: Recording disabled
- **WHEN** history recording is disabled
- **THEN** no record is offered and the open fails

### Requirement: Index lifecycle proven against a real index
The pilot SHALL be tested against a named `CSSearchableIndex` with a test-specific name, covering
insertion of the generated entity, removal of the whole entity type, and the production
remove-then-index refresh cycle.

#### Scenario: The real index accepts the entity
- **WHEN** the generated entity is indexed through the adapter's own wrapper into a test-specific index
- **THEN** the call succeeds against the real framework, not a mock

#### Scenario: Removal succeeds and is idempotent
- **WHEN** the entity type is removed, then removed again
- **THEN** both calls succeed, so an already empty index is not an error state

#### Scenario: A full refresh cycle
- **WHEN** a remove followed by an index runs, as on every history change
- **THEN** both calls succeed against the real index

#### Scenario: Test index is disposable
- **WHEN** an index test finishes, including on failure
- **THEN** the test-specific index is emptied and leaves no pilot entity on the machine

#### Scenario: Contents are not claimed as proven
- **WHEN** the index gate reports
- **THEN** it states that App Intents and Core Spotlight expose no read-back of a named index, so
  the test proves the calls and not the resulting contents, and the rule about which entities belong
  in the index is owned by the pure mapping tests

### Requirement: Registration is proven
The pilot SHALL write its launch flag only when the entity resolver and both intent handlers are
non-nil, SHALL log each registry's state at launch, and SHALL be readable by a runtime probe.

#### Scenario: Registration populates the registries
- **WHEN** registration runs
- **THEN** the launch log reports the resolver, the open handler and the search handler as present

#### Scenario: A partial registration cannot set the flag
- **WHEN** any of the three registries is nil after the assignments
- **THEN** the flag is not written, so a probe reading it cannot be fooled

#### Scenario: The probe reads the state
- **WHEN** the built app is launched and the flag is read back
- **THEN** it reports registered, and the first index refresh is logged

### Requirement: Gate naming is honest
The verification documentation SHALL name each gate for the scope it actually covers, and SHALL
state that Siri and Spotlight surfaces are outside every automated gate, and that registration is
proven by a runtime probe rather than by the test command.

#### Scenario: A reader checks the gate
- **WHEN** a reader sees `applicationTests: pass`
- **THEN** the documentation states which suites produced it, that the index test proves calls and
  not index contents, and which surfaces remain unobserved
