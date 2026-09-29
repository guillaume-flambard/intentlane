# Security policy

## How to report

GitHub private vulnerability reporting is not enabled on this repository, so do
not look for a report form. The route that works today is:

Open a regular issue whose entire body is the words "security report, please
open a private channel". Nothing else. No detail in the title, no code, no
logs, no screenshot. That opens a public thread carrying no technical content,
and it is answered privately.

Never put exploit detail, credentials, or audit data belonging to a third party
in that first issue. IntentLane reads an app's intent surface, and a report that
inadvertently includes a customer's Siri or Shortcuts configuration is a report
that has already leaked.

If the issue tracker is not an option, the same applies to whatever private
channel you can reach.

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
