# Security policy

## How to report

Use GitHub private vulnerability reporting. Go to `Security` then `Report a
vulnerability` on this repository. The channel is enabled, so the form exists.

If you cannot use it, open a regular issue containing only the words "security
report, please open a private channel", with no technical detail, and wait.

Never put exploit detail, credentials, or audit data belonging to a third party
in a public issue. IntentLane reads an app's intent surface; a report that
inadvertently includes a customer's Siri or Shortcuts configuration is a report
that has already leaked.

## What happens next

| Stage | Commitment |
|---|---|
| Acknowledgement | within 7 days |
| Triage and severity | within 30 days |
| Fix or mitigation | agreed with the reporter, not unilaterally imposed |
| Disclosure | coordinated with the reporter, never on a fixed date from our side |

These are commitments about attention, not about a clock. A fix date before the
severity is known would be a promise made without information.

## What matters most here

IntentLane reads and generates code against an app's intent surface, so the
expensive failures are integrity failures rather than crashes:

- Generated code that drops, silently narrows, or inverts a declared intent. A
  generated file that compiles and behaves wrongly is worse than one that fails.
- A validation path that accepts a surface it should reject, so a later step
  reports coverage it did not achieve.
- Anything that reads or writes outside the project directory it was pointed at.
- Path traversal in project identifiers, template names, or generated file
  destinations.

A wrong audit result is a defect. A wrong audit result presented as a correct one
is the security issue.

## Supported versions

`main` at 0.x. There is no release line to backport to, and no stable channel
yet. The published npm package is tracked separately from this repository; see
`docs/product/OPEN-CORE-READINESS.md` for what is and is not released.
