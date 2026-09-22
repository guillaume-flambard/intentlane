# IntentLane audit engagement

This is the delivery template for the fixed-scope compatibility audit. It
turns the auditor's JSON into a report a buyer can read, and it fixes what the
engagement includes, what it excludes, what counts as acceptance and how the
work hands over.

`COMMERCIAL-READINESS.md` owns the claims matrix and the marketing gate. This
document only describes the deliverable, and it never asserts a claim that
document does not allow.

## Inputs

| Input | Why |
| --- | --- |
| One repository | The audit is read-only and runs on the checkout the buyer names. |
| One target platform, macOS 27 or iOS 27 | Availability and evidence are per platform, so two platforms are two engagements. |
| Up to three candidate journeys | Each journey is a named action plus the content it acts on. |
| The installed SDK path | `--sdk-path` records the SDK version and flags a capability that needs a newer one. |
| Build metadata, when it exists | `--build-metadata` promotes what is registered from `implemented` to `tested`. |

## Report template

Every audit delivers one JSON report plus its text reading. The JSON is the
authoritative artifact; the text reading is for the buyer. The report carries
these blocks, in this order:

| Block | What it states | What it cannot state |
| --- | --- | --- |
| `target` | The name, platform and deployment floor that was audited. | Nothing about a platform that was not requested. |
| `sdk` | The SDK version and canonical name read from `SDKSettings.json`. | Whether a newer SDK would change an answer. |
| `score` | A 0 to 100 figure, its band, the points, the per-state counts and the discovery route (`schema-backed`, `shortcuts-only` or `none`). | Whether a journey actually runs. The score measures breadth over the catalogue. |
| `route` | `native`, `bridged`, `ineligible` or `unknown`, with the evidence and a next action. | The cost of the work. It qualifies the route, not the estimate. |
| `data` | The classes read from declared properties, whether entities are indexed, and the privacy manifest state. | The contents of the manifest. It reports presence, not the policy inside. |
| `architecture` | `local`, `synced`, `remote` or `unknown`, with the evidence. | Latency or data volume. It qualifies where content resolves. |
| `conditions` | The nine conditions a capability test depends on, five recorded from the machine and four a person must confirm. | A Siri result. Without the four, a failure cannot be attributed to the app. |
| `quality` | The action signals found and the issues, such as a shortcut phrase that omits the application name. | The conversational quality of a response. |
| `catalogue` | The catalogue version against the SDK that was inspected. | Anything about a capability the catalogue does not carry. |
| `targets` | How many Xcode targets were found and how many compile for the platform, so a capability is only credited to the target that carries it. | Anything about a target outside the audited directory. |
| `findings` | One row per capability, with the state, the confidence, the evidence, the required companions, the gaps and the next action. | A guarantee that a capability the app implements will pass Siri. |

The states are `unsupported`, `unknown`, `detected`, `implemented`, `tested`
and `feasible`. `tested` means an automated test or extracted metadata exists;
only a pilot evidence ledger may mark a journey verified. A gap is either a
defect that blocks `--strict` or an advisory scope hint, and the report says
which, because `ILA100` and `ILA150` are informational.

## Engagement checklist

1. Record the repository revision, the licence and the build command.
2. Confirm the platform and the deployment floor, and read the SDK version.
3. Run `intentlane audit <repo> --platform <platform> --format json` and keep
   the raw report.
4. Add `--sdk-path` and `--build-metadata` when both exist, and keep that
   second report; the delta between the two is the first piece of evidence.
5. Read `route`, `data` and `architecture` and record the qualification in the
   buyer's words, not in IntentLane's.
6. Walk the three candidate journeys and mark each as feasible, blocked or out
   of scope, naming the schema, the entity and the missing companions.
7. List the risks: a schema the platform does not ship, a domain with one side
   only, a privacy manifest that is missing while entities are indexed.
8. Write the bounded implementation plan: one domain, two or three journeys,
   the adapter interfaces the app must implement, and the evidence each step
   must produce.
9. State the conditions that were not recorded, so no later failure is blamed
   on the code by default.

## Fixed scope

The engagement covers one repository, one platform, and up to three named
journeys. It delivers the per-target evidence report, the feasible journey map,
the risk list and the bounded implementation plan.

## Exclusions

Implementation, App Store submission, access to production data, guaranteed
natural-language outcomes, third-party credentials and domains Apple does not
support are out of scope, as `COMMERCIAL-READINESS.md` already states.

## Acceptance evidence

The audit is accepted when the report is deterministic for the same input, the
worktree it inspected is unchanged, every conclusion names its platform and its
evidence, and no conclusion claims a Siri result that was not observed. The
checks that prove it are `pnpm test`, `pnpm build`, `git diff --check` in the
auditor repository, and the unchanged worktree fingerprint of the audited
repository.

## Handoff

The buyer keeps the JSON report, the text reading and the list of conditions
that were not recorded. A later implementation engagement starts from that
report, and its claims matrix stays tied to the pilot evidence ladder in
`PILOT-PLAYBOOK.md`.
