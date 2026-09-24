# Client access, security and confidentiality protocol

This protocol applies before IntentLane reads, generates or changes client
code. It is an engineering delivery rule, not legal advice. A client security
or legal team remains the authority for its data, policies and agreements.

## Access boundary

1. Agree the scope, target platforms, named journeys and data classes before
   requesting access.
2. The client grants a least-privilege repository account or a controlled
   remote development environment. Do not request production administrator
   access, signing keys or a database export to begin an audit.
3. Work in a branch or fork. Deliver changes as a pull request. The client
   owns review, merge, release signing and production deployment.
4. If source code or telemetry cannot leave the client's environment, use its
   approved remote workspace instead of copying it to a personal machine.

## Data boundary

- Default to fixtures, synthetic records and a staging account. Production data
  needs an explicit written exception and the client's approved environment.
- Never place credentials, access tokens, article bodies, private files or
  personal data in a contract, source fixture, log, screenshot, issue or pull
  request description.
- Spotlight indexing is opt-in per data class. Index only approved minimal
  fields, normally a stable identifier and a display title. Private content is
  not indexed merely because it is technically available.
- The adapter must return no entity for an unknown identifier and no result for
  an unmatched query. It must never substitute another record as a fallback.

## Sensitive actions

For each action, record its risk level and the client-approved policy. A write,
financial, security, deletion or sharing action requires an exact target,
authorization appropriate to the app, and a user-visible confirmation where
the risk analysis requires one. The first pilot is read-only: it searches and
opens approved fixture articles only.

## Verification and release gate

1. Read-only audit and data-flow review.
2. Unit and App Intents tests with synthetic fixtures, including missing and
   collision cases.
3. Build and metadata extraction in CI.
4. Staging test with an approved test account.
5. Manual Spotlight and Siri test, recording OS build, locale, device class and
   fixture outcome.
6. Client code review and release approval.

No customer-facing compatibility claim, external pull request or marketing
statement is made before this gate and independent reproduction are complete.
