# IntentLane pilot playbook

## Candidate criteria

Choose a public, actively buildable, legally forkable app with a native macOS
or iOS target, a small real content model and two or three actions matching an
Apple schema domain. Reject apps requiring production credentials, unclear
licensing, web-view-only architecture, no reproducible build, or an unsupported
schema for the desired action.

Record upstream revision, licence, target and deployment floor, Xcode and OS
build, device or simulator, selected domain, selected journeys and schema fit.

[AUDIT-GUIDE.md](AUDIT-GUIDE.md) documents the baseline recipe: run the audit on
the pinned revision in all three formats, keep the JSON next to the evidence
ledger, and compare the delta after the implementation.

## Isolation

1. Use a disposable fork or worktree outside IntentLane.
2. Keep build products and logs outside the fork.
3. Use harmless local fixture data only.
4. Do not add credentials, user exports or private endpoints.
5. Keep the branch private until licence and disclosure are resolved.

## Journeys

Limit a pilot to three: discover a named item, open it, then perform one safe
action. Each journey declares domain, input entity or value, result, claimed
surface and negative case. Write actions define confirmation, authentication,
ownership and failure before implementation.

## Evidence ladder

| Layer | Required evidence |
| --- | --- |
| Contract | `AppIntentsTesting` covers result, query and negative or risk path. |
| Build | Target compiles and metadata contains advertised actions and schemas. |
| Shortcuts | Installed app shows correct action, parameters and result shape. |
| Spotlight | Intended content is found and linked when this is claimed. |
| Siri | Manual macOS or iOS test completes exact phrasing and expected action. |

Record each layer as `pass`, `fail`, `not-applicable` or `blocked`, with OS
build, locale, fixture data and observation. Screenshots support observations
but never replace tests, logs or metadata.

## Platform procedure

For macOS 27: build, install or launch, check Shortcuts, check Spotlight when
claimed, run the Siri journey, repeat a negative or unsafe case, then export
the audit delta and evidence ledger. Then export the delta between the pinned
baseline and the post-implementation report with
`npx intentlane audit-diff baseline.json candidate.json --fail-on regression`,
keep the rendered delta next to the evidence ledger, and treat any regression
entry as a release blocker until a person explains it.

For iOS 27: use a native development or signed device build, not Expo Go. Run
the same sequence and document every macOS versus iOS difference.

## Exit criterion

A pilot is case-study ready only when every advertised journey passes required
layers, a second developer reproduces it, and no public claim exceeds evidence.

## Evidence ledger template

Record the pilot in a versioned ledger and validate it locally:

```sh
intentlane evidence validate evidence-ledger.yaml
intentlane evidence validate evidence-ledger.yaml --strict
```

`--strict` exits non-zero while the ledger reads `unverified`. A ledger is
`verified` only when every required layer is `pass` for every journey and an
independent reproduction is `pass`. Copy this template, keep the audit baseline
and delta next to it, and reference them as relative paths. References are
never read by the validator.

```yaml
schema: pilot-evidence/1.0
pilot: ledgerapp-macos
platform: macos
revision: ledgerapp-2.7.1
conditions:
  osBuild: macOS 27 build 23A123
  xcode: Xcode 27 build 17A123
  locale: en-US
  device: MacBook Pro 14-inch
journeys:
  - id: find-alpha
    claimed: [shortcuts, spotlight, siri]
    layers:
      contract: pass
      build: pass
      shortcuts: pass
      spotlight: pass
      siri: pass
    risky: false
reproduction:
  by: reviewer-b
  status: pass
artifacts:
  baseline: ./audit-baseline.json
  delta: ./audit-delta.json
```

`contract` and `build` are always required. `shortcuts`, `spotlight` and
`siri` are required only when claimed. A risky journey also documents
confirmation, authentication and ownership. Use harmless local fixture data
only, never credentials or production content.
