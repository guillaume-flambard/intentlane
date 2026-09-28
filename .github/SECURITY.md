# Security policy

## Supported code

Security fixes target the current `main` branch and the latest package published
under `@memolabs-apps/intentlane`. The Expo plugin and Studio application are not
released products yet.

## Report a vulnerability privately

Do not open a public issue with exploit details, private repository content,
credentials, or personal data.

Contact [Guillaume Flambard](https://www.linkedin.com/in/guillaume-flambard)
privately and include only enough initial context to arrange a secure exchange:

- the affected command or component;
- the impact you believe is possible;
- whether the issue affects a published package or only `main`;
- a safe way to contact you.

If a private contact is not possible, open a public issue that says only that you
need a private security contact. Do not include the vulnerability details.

There is no formal response-time commitment yet. The maintainer will acknowledge
the report, confirm the supported scope, and agree on disclosure before details
are published.

## Scope

Useful reports include unintended writes by the auditor, command execution beyond
an explicit application-owned gate, generated-code injection, secret exposure,
unsafe path handling, and dependency vulnerabilities that are reachable through
the published CLI.

Reports about Siri choosing a different phrase, unsupported Apple behavior, or a
feature that is explicitly out of scope belong in the normal issue tracker.
