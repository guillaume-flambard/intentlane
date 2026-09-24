## ADDED Requirements

### Requirement: La couture qui lit l'application est liée au main actor
Every pilot's seam that reads application state SHALL be main-actor bound, and the
compiler SHALL enforce it. A resolver running off the main thread SHALL NOT read an
application model the interface mutates.

#### Scenario: La couture est appelée depuis un actor
- **WHEN** an entity resolution reads the application's model
- **THEN** the read happens on the main actor, and a live implementation that cannot
      guarantee it does not compile

#### Scenario: Un test double n'est pas lié au main actor
- **WHEN** the protocol's read is asynchronous
- **THEN** a synchronous test double still satisfies it, so the split that keeps the
      rules testable without the application survives the fix

#### Scenario: Un défaut de ce type apparaît sur une stack
- **WHEN** a review finds it on one pilot
- **THEN** the other certified pilot is checked, and if present the recipe carries
      one rule for both, because two stacks make it a method defect

#### Scenario: L'application expose un état réellement isolé
- **WHEN** a pilot's application state is genuinely thread-safe
- **THEN** the rule still applies by default, and departing from it is a recorded
      decision rather than the default, because the cost of being wrong is a crash
      in someone else's application
