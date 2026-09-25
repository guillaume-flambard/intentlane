## Purpose

Make the object motif read the shape real applications use, and make a discovery that
cannot act report that instead of reporting a pass.

## ADDED Requirements

### Requirement: A declaration is read as a whole

The object motif SHALL read a type declaration across every line it spans, so a protocol
conformance written on a continuation line is part of the declaration.

#### Scenario: The conformance is on a continuation line

- **WHEN** a type conforms to a list data source protocol on a line after the one that
  introduces the type
- **THEN** the type is found as an object candidate

#### Scenario: The proof points at the introduction

- **WHEN** a declaration spans several lines
- **THEN** the proof names the first line of the declaration, because that is where a
  reader is sent to see the type

#### Scenario: A declaration that never ends is not an object

- **WHEN** a file ends while a declaration is still open
- **THEN** no object is emitted from it, because an unterminated declaration is not
  something to build a claim on

### Requirement: A discovery that cannot act is blocked, not passed

`analyse` SHALL be blocked when it finds object classes and none of them carries both an
identifier and an opening path, and SHALL name the classes it found.

#### Scenario: No candidate is actionable

- **WHEN** every object class found has no identifier or no opening path
- **THEN** the step is blocked rather than passed, and the reason names the classes

#### Scenario: A zero is not a partial success

- **WHEN** the count of actionable classes is zero
- **THEN** the step does not pass, because a discovery that can integrate nothing has
  integrated nothing

#### Scenario: One actionable class is enough

- **WHEN** at least one class carries an identifier and an opening path, all backed
- **THEN** the step passes, and the count of actionable classes is reported alongside the
  total so a reader sees how decisive the finding was
