## Purpose

Turn the findings of the pilots into requirements the method carries forward, so
that knowledge does not live only in the narrative of a commit or in a runbook
somebody has to remember.

A finding is only useful if the next pilot inherits it. Each requirement below
names the finding, the evidence, and the pilot that produced it, so it can be
contested. Nothing here is a defect left open: the two tool defects the pilots
found were fixed in the tool, not worked around in a pilot, and those fixes are
recorded as requirements so they cannot be undone silently.

The raw records are `../../candidates.md`, `../../deviations.md` and the two
`QUALIFICATION.md` files. This spec is the list of what the method now requires
because of them.

## ADDED Requirements

### Requirement: Build prerequisites are discovered by probing, so they are counted
The method SHALL expect an application's build to probe for its tools one missing
one at a time, and SHALL record the full list rather than the last one found.

#### Scenario: A project's configure script stops at a missing tool
- **WHEN** `configure` names a tool the machine lacks
- **THEN** the tool is installed, configure runs again, and the next missing tool is
      recorded, until configure completes

#### Scenario: A tool with a deceptive name
- **WHEN** a project's bundled library needs `glibtoolize`
- **THEN** the pilot records that this is Homebrew's `libtool` and not the
      `libtool` macOS already ships, because installing the obvious package changes
      nothing

### Requirement: The toolchain itself is a prerequisite
The method SHALL treat a missing toolchain component as a prerequisite, with its
size and download time measured.

#### Scenario: The core compiles shaders the toolchain no longer includes
- **WHEN** an application compiles Metal shaders and the toolchain no longer ships
      the Metal compiler
- **THEN** the component is named, its size and download time are recorded, and the
      build is not reported as blocked on a code problem

### Requirement: An interrupted build is cleaned before retrying
The method SHALL clean an interrupted build's own state before retrying, because a
project's clean step may not remove what its interrupted run left behind.

#### Scenario: A retry fails on a directory that already exists
- **WHEN** an autotools run is interrupted and leaves a directory its own clean step
      does not remove
- **THEN** that directory is removed before the retry, and the behaviour is recorded
      as a recurring trap rather than a one-off

### Requirement: A fork's provenance is corrected before building
The method SHALL point a fork's origin at the real upstream before building, because
a C project's build system records the origin in its generated configuration.

#### Scenario: A fork was cloned from a local path
- **WHEN** the fork's origin is a local screening clone
- **THEN** the origin is reset to the real upstream and configure is re-run, so the
      generated configuration does not carry the local path as provenance

### Requirement: The toolchain of a project that has no Swift is declared explicitly
The method SHALL set `SWIFT_OBJC_BRIDGING_HEADER` and `SWIFT_VERSION` on a target
that had no Swift, rather than relying on defaults that do not exist there.

#### Scenario: A target has no Swift build settings
- **WHEN** Swift is added to an Objective-C target
- **THEN** both settings are written explicitly, in every build configuration, by a
      script that is idempotent

### Requirement: The tool's macOS floor gap stays fixed
The contract schema SHALL accept `min_macos`, and SHALL require at least one
platform floor. A declared floor SHALL NOT be judged against a catalogue entry for
the other platform.

#### Scenario: A macOS-only contract declares a floor below a schema's requirement
- **WHEN** a macOS application declares `min_macos: "10.14"` and uses a system schema
- **THEN** no floor diagnostic fires, because the catalogue states iOS floors only

#### Scenario: The generator derives availability from the schema
- **WHEN** a contract declares a floor below 27 and uses a system schema
- **THEN** the availability annotation is still emitted, because it follows the
      schema rather than the floor, and the generator does not crash when a floor is
      absent

### Requirement: The audit's route and target resolution stay fixed
The audit SHALL resolve a target's platform through the project's build
configuration when the target does not declare its own, SHALL NOT report a native
route for a repository with no target for the audited platform, and SHALL refuse a
missing directory.

#### Scenario: A target inherits SDKROOT from the project
- **WHEN** the project declares `SDKROOT` once and every target inherits it
- **THEN** the audit resolves the platform for each target, reads discovery over the
      scoped files, and reports the Shortcuts-only profile rather than `none`

#### Scenario: An Objective-C repository has no macOS application target
- **WHEN** the repository contains Xcode projects that build for the platform but no
      target belonging to the application
- **THEN** the route is not reported as native for that platform, and a real target
      whose platform cannot be resolved is still treated as a target

#### Scenario: A human judgement remains
- **WHEN** a target exists for the platform but is a preview helper rather than the
      application
- **THEN** the tool does not decide, and the judgement stays human and is written
      into the qualification record

### Requirement: The metadata protocol list is a pilot asset
The protocol list the compiler requires SHALL be tracked with the pilot, because it
is an input that is not derivable from the contract and was lost once with a
workspace.

#### Scenario: The list is regenerated
- **WHEN** a pilot's output is regenerated
- **THEN** the tracked list is used, and the pilot does not depend on a scratch file
