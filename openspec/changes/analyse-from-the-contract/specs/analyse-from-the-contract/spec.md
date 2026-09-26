## Purpose

Read the seams `analyse` checks from the pilot's contract when one exists, so a pilot
whose choice is already written down is judged against that choice rather than against a
heuristic that cannot see it.

## ADDED Requirements

### Requirement: A declared contract names the seams to check

When a pilot declares a contract, `analyse` SHALL check the contract's own named fields
against the repository instead of the object motif: the identifier field, the display
title field, and an opening implementation reached with that identifier.

#### Scenario: The contract's fields are present and reached

- **WHEN** the contract names `identifier: id` and `display.title: title`, the repository
  declares both as `String`, and an `open` implementation is called with that identifier
- **THEN** the step passes, and the reason counts the entities checked

#### Scenario: The contract names a field the implementation does not carry

- **WHEN** the contract names an identifier field and no declaration of that field typed
  as `String` exists
- **THEN** the step is blocked, and the diagnostic names the missing field rather than
  reporting that no object class was found

#### Scenario: An identifier that never reaches the opener

- **WHEN** the repository declares both fields and has an `open` implementation, but no
  call to it passes the contract's identifier field
- **THEN** the step is blocked, because an opener that is never reached with the
  identifier cannot open the object the contract names

#### Scenario: The proof is required as before

- **WHEN** a seam cannot be given a path, a line and an excerpt
- **THEN** the step does not pass, because a seam without evidence is an assertion

### Requirement: A repository with no contract keeps the motif

`analyse` SHALL use the object motif unchanged when the pilot declares no contract, and
SHALL write the discovery to `discovery.json` in both cases.

#### Scenario: No contract is available

- **WHEN** the pilot's contract cannot be resolved
- **THEN** the object motif runs unchanged and its discovery is still written
