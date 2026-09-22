# IntentLane open core readiness

This is the evidence inventory and gap matrix for contributing to and
maintaining IntentLane in the open. Every line under evidence was verified by a
file or a command, and every unresolved choice is recorded as a decision
required rather than invented.

## Evidence inventory

| Area | Evidence |
| --- | --- |
| Licence | `LICENSE` (MIT), `"license": "MIT"` in `package.json` and in the two publishable packages. |
| Contribution guide | `CONTRIBUTING.md`: what helps most, what to include in an issue, the development commands, the ten rules the code follows, and the commit and pull request rules. |
| Agent guide | `AGENT-GUIDE.md`, plus the programme section that points at the Siri 27 documents. |
| Documentation | `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `MIGRATION.md`, `PRD.md`, `MARKET-STUDY.md`, `ROADMAP.md`, `AUDIT-GUIDE.md`, `PILOT-PLAYBOOK.md`, `COMMERCIAL-READINESS.md`, `AUDITOR-SPEC.md`, `APPLE-27-APP-INTENTS-RESEARCH.md`, `SIRI-27-ROADMAP.md`, `UNEXPLORED-ANGLES.md`, `OPEN-CORE-READINESS.md`, `AUDIT-OFFER.md`, `PILOT-NETNEWSWIRE.md`. |
| Machine-readable contract | `intentlane.schema.json`. |
| CI | `.github/workflows/ci.yml` with four jobs: `checks` (typecheck, build the CLI bundle, 277 tests, validate, determinism), `swift` (matrix `macos-15` and `macos-26`), `macos` (`xcode-27`: four passes of `verify.mjs`, then audit the shelf, studio and reader fixtures), `simulator` (bundle, prebuild, Release build, metadata assertions). |
| Issue intake | `.github/ISSUE_TEMPLATE/pilot-report.yml`, a form that asks for the contract excerpt, the toolchain, the goal, the outcome, `intentlane doctor`, the diagnostics, the contract gaps and any hand-written Swift. |
| Repository settings | Public repository under MIT, default GitHub labels only. Verified with `gh api /repos/guillaume-flambard/intentlane` (`public`, `MIT`) and `gh label list` (ten default labels, no `pilot report`). |

## Gap matrix

| Area | State | Decision required |
| --- | --- | --- |
| Contributor setup | Reproducible and verified from a clean checkout: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test` (277 tests), `pnpm validate`, then `pnpm generate --output .intentlane/generated` before `--check`. The documented commands failed before this check, because `.intentlane/` is not versioned and `--check` had no output to compare. | Whether to run the same path from a clean checkout in CI, and who owns that check. |
| First contribution path | Described in prose, not as a guided list of first issues. | Whether to seed `good first issue` items and label them as such. |
| Issue intake | One form for pilots. No bug or feature form. | Whether to add a shorter bug form and a feature form, and what each must ask. |
| Pull request intake | No pull request template. | Whether to add one, and whether it repeats the definition of done or links it. |
| Triage | No triage vocabulary beyond the default labels. The pilot form requests a `pilot report` label that does not exist in the repository, so a submitted pilot report is filed without it. | Whether to create the triage labels (including `pilot report`) or to drop the label from the form, and who triages. |
| Governance | No `GOVERNANCE.md`. | Who decides, how a decision is recorded, and whether decisions live in `openspec/changes/` or in the roadmap. |
| Conduct | No `CODE_OF_CONDUCT.md`. | Which code applies, who enforces it and how a report is received. |
| Security disclosure | No `SECURITY.md`. | Where a vulnerability report goes, what the response window is, and whether a private channel exists. |
| Release process | No `CHANGELOG.md`, no tags, no release workflow. Version `0.1.0` in `package.json` and in the publishable packages, and the CLI reports its version from a constant in `packages/cli/src/index.ts`. | How versions are cut, whether a changelog is maintained, whether tags are created, and how the version constant stays in step. |
| Package publication | `@intentlane/cli` and `@intentlane/expo` are publishable and proved by `npm pack` plus a clean install, but nothing is on the registry because the machine has no npm credentials. | Who owns the npm scope and when the first publication happens. |
| Documentation ownership | Documents exist without an owner or a review rule. | Who reviews a documentation change, and which documents are normative when two disagree. |
| Dependency updates | No `dependabot.yml` or equivalent. | Whether automated dependency updates are enabled and at what cadence. |
| Communication sequence | `COMMERCIAL-READINESS.md` gates claims on pilot evidence and `PILOT-PLAYBOOK.md` defines the evidence ladder. | Nothing to decide before a pilot exists; the sequence is already written. |

## Sequence

1. Record the inventory and the decisions above. Nothing in this document
   asserts a policy that an owner has not chosen.
2. Make the contributor path reproducible and verified from a clean checkout.
3. Add the approved intake templates and the triage labels.
4. Add conduct, security and release documents only after their owners decide
   the content.
5. Promote the project only after a reproducible pilot, with a quickstart and
   `intentlane audit` that separates shortcuts from schema-backed readiness, and
   keep every claim tied to a named capability, platform and proof artifact.
