# studio capability map

## ADDED Requirements

### Requirement: The capability map SHALL be a pure derivation of the audit report
The mapping SHALL be a pure function from an `AuditReport` to a `CapabilityNode` tree.

The mapping from an `AuditReport` to a `CapabilityNode` tree is a pure function
with no filesystem, no subprocess and no model call. The same report always
produces the same tree.

#### Scenario: One finding produces one node under its catalogue group

- **WHEN** a report has one finding whose capability is `discovery.entity-query`
- **THEN** the tree has one group `discovery` with one node, and the node's
  `state`, `confidence`, `requirements`, `gaps` and `nextAction` equal the
  finding's.

#### Scenario: A finding outside the known groups is kept, not dropped

- **WHEN** a finding's capability is `unlisted.thing` and `unlisted` is not one of
  the catalogue's groups
- **THEN** the tree contains an explicit `other` group with that node, and its
  position is after the known ones.

#### Scenario: A finding with no evidence renders a node without evidence

- **WHEN** a finding has `evidence: []`
- **THEN** the node carries no evidence reference and none is invented.

### Requirement: The map SHALL render the report's states and no others
Each node SHALL carry the finding's own state verbatim, and no state SHALL be declared that the report does not produce.

The report carries six states
(`unsupported`, `unknown`, `detected`, `implemented`, `tested`, `feasible`). The
map's states are those six, and no `verified` state is declared by this map.

#### Scenario: Every state in the report is renderable

- **WHEN** a fixture has one finding per state plus one finding per empty
  evidence shape
- **THEN** every node renders without a mapping failure and the map's state for
  a finding equals the finding's own state, verbatim.

### Requirement: The inspector SHALL name the findings row, verbatim
The inspector SHALL render the original finding rather than a summary of it.

The inspector renders the original finding's `capability`, `state`, `confidence`,
`gaps`, `evidence` and `nextAction`. The user must be able to reach the original
row, not a summary of it.

#### Scenario: The inspector opens the original row

- **WHEN** a node is selected that carries evidence
- **THEN** the inspector shows the exact path, the line when present, the gap
  codes, and the row's own `nextAction` text.
