## Purpose

Etablir ce que le harnais de preuve d'execution peut affirmer, sur la base de l'interface
reelle du framework, avant de generer une seule assertion.

## ADDED Requirements

### Requirement: The harness surface is read from the shipped framework

The design of the runtime harness SHALL be based on the public interface shipped with
Xcode, not on a recollection of the API. The resolved surface SHALL include entity
resolution by type identifier, the generated queries reached through the runtime, and
dynamic property access that throws when a declared display property is unreachable.

#### Scenario: The recorded surface is the one the framework declares

- **WHEN** the shipped interface is read
- **THEN** the recorded entry points exist with the recorded signatures, including a
  throwing dynamic property accessor

### Requirement: The harness needs a host bundle, and says so

The harness SHALL NOT be runnable through the current standalone `swiftc` scripts, because
runtime resolution is by bundle identifier and type identifier. A host application target
and a test target SHALL be required, and their signing SHALL be part of the recipe.

#### Scenario: The standalone route is refused as insufficient

- **WHEN** a plan proposes to run the harness from the existing `swiftc` test scripts
- **THEN** it is refused, because those scripts produce no application bundle to resolve
  against

### Requirement: No type identifier is written before it is observed

The generator SHALL NOT emit a type identifier string until the metadata processor has
actually been observed to produce output. A type identifier guessed from Swift naming
SHALL be refused, because a harness that compiles and fails at runtime is worse than no
harness.

#### Scenario: A guessed type identifier is refused

- **WHEN** the harness would contain a type identifier that no observed metadata
  contained
- **THEN** the emission is refused and the missing observation is named

### Requirement: The const values requirement is recorded, not assumed

The metadata extraction depends on the compiler emitting const values at build time. The
design SHALL record that this is a target build setting, and SHALL NOT claim a
command-line invocation that has not been observed to work.

#### Scenario: An unverified compiler flag is not documented as working

- **WHEN** a candidate flag has been rejected by the compiler
- **THEN** the design records the rejection rather than listing the flag as a recipe
