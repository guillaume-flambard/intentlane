## ADDED Requirements

### Requirement: The deliverable is a read-only rendering of a written audit report

The system SHALL render a client deliverable from an audit report that already
exists, SHALL NOT re-audit the project, and SHALL NOT read the audited
repository. Two renderings of the same report SHALL be byte-for-byte identical.

#### Scenario: A report is rendered twice
- **WHEN** the same report is rendered twice
- **THEN** both renderings are identical and neither invocation touched the audited project

#### Scenario: A report is rendered without the project
- **WHEN** a deliverable is rendered from a report on a machine that does not hold the audited repository
- **THEN** the deliverable is produced, because the report is the only input it reads

### Requirement: Every number in the deliverable is copied from the report

The system SHALL copy each number it shows from the report and SHALL NOT
recompute, reweight or rederive it. The system SHALL NOT show a metric the
report does not carry.

#### Scenario: The compatibility score
- **WHEN** a deliverable shows a score
- **THEN** the score, its band, its points and its maximum are the report's own values, and no other score appears

#### Scenario: Capability counts
- **WHEN** a deliverable counts capabilities by state
- **THEN** the counts are the number of findings the report carries in each state, with no state the report does not define

### Requirement: Machine evidence and human evidence are rendered apart

The system SHALL render automated findings in one section and SHALL leave human
observations in a separate, unfilled section. A human observation SHALL NOT be
rendered as automated proof, and an automated result SHALL NOT be rendered as a
human observation.

#### Scenario: The deliverable has no human observation yet
- **WHEN** a deliverable is rendered before anyone has observed the app by hand
- **THEN** the human section is present and empty, and no automated result appears inside it

#### Scenario: Nothing automated is claimed as observed
- **WHEN** a report contains an implemented finding
- **THEN** the deliverable states it as an automated result, and does not state that a person saw it work

### Requirement: An undecided capability is rendered as undecided

The system SHALL render a capability the audit did not decide as undecided, and
SHALL NOT resolve it in either direction. Absence SHALL stay absence and SHALL
NOT be rendered as a negative result.

#### Scenario: A capability the audit did not classify
- **WHEN** a report carries a finding in state `unknown`
- **THEN** the deliverable renders it as not decided, and does not render it as unsupported or as implemented

#### Scenario: No finding names a capability
- **WHEN** a capability does not appear in the report
- **THEN** the deliverable does not name it at all, rather than listing it as missing

### Requirement: The platform boundary is explicit

The system SHALL render the results of each audited platform separately, and
SHALL NOT merge them into one verdict. Shortcuts-only support SHALL NOT be
rendered as Siri or Apple Intelligence support.

#### Scenario: Two platforms audited
- **WHEN** a deliverable is rendered from reports for macOS and for iOS
- **THEN** each platform has its own section, and no statement is made about a platform that was not audited

#### Scenario: Shortcuts-only support
- **WHEN** a report records a Shortcuts implementation without schema evidence
- **THEN** the deliverable presents it as Shortcuts support, and does not present it as Siri or Apple Intelligence support

### Requirement: The claim boundary travels with the deliverable

The system SHALL state, in the deliverable, what the audit asserts, what it
refuses to assert, and what only a human can settle.

#### Scenario: The deliverable states its limits
- **WHEN** a deliverable is rendered
- **THEN** it names that the audit is read-only and local, that absence is reported as `unknown` rather than `missing`, and that Siri behaviour was not observed by the audit

### Requirement: The deliverable answers the client's questions in reading order

The system SHALL render the deliverable in the order a client reads it: what the
application can do today, what is blocked, what is next to build, and what
remains unproven.

#### Scenario: The first section is the present state
- **WHEN** a deliverable is rendered
- **THEN** it opens with what the application supports today, before it states any gap or any recommendation

### Requirement: An unreadable report is refused rather than rendered

The system SHALL refuse to render a deliverable from a report it cannot parse,
and SHALL name the reason. It SHALL NOT emit a partial or empty deliverable
that looks complete.

#### Scenario: A report that is not valid JSON
- **WHEN** a deliverable is requested from a file that is not valid JSON
- **THEN** the command exits non-zero, names the file, and writes no deliverable

### Requirement: The window shows the deliverable the engine rendered

The macOS application SHALL display the deliverable exactly as the engine
produced it, and SHALL NOT recompose it. What the window shows SHALL be
character for character what the command wrote for the same report.

#### Scenario: The window and the file agree
- **WHEN** a deliverable is rendered by the command for a report, and the window
        is asked to show the deliverable for that same report
- **THEN** the text the window shows is identical to the text the command wrote

#### Scenario: The window is asked for a document it does not have
- **WHEN** no deliverable has been produced for the project
- **THEN** the window states that there is no deliverable yet, and shows no document

### Requirement: The deliverable can be taken out of the window

The macOS application SHALL offer to save the deliverable to a file the user
names, and SHALL write exactly the text it displayed.

#### Scenario: Saving the deliverable
- **WHEN** a user saves the deliverable from the window
- **THEN** the file written is byte-for-byte the text the window displayed
