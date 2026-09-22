# IntentLane pilot playbook

## Candidate criteria

Choose a public, actively buildable, legally forkable app with a native macOS
or iOS target, a small real content model and two or three actions matching an
Apple schema domain. Reject apps requiring production credentials, unclear
licensing, web-view-only architecture, no reproducible build, or an unsupported
schema for the desired action.

Record upstream revision, licence, target and deployment floor, Xcode and OS
build, device or simulator, selected domain, selected journeys and schema fit.

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
the audit delta and evidence ledger.

For iOS 27: use a native development or signed device build, not Expo Go. Run
the same sequence and document every macOS versus iOS difference.

## Exit criterion

A pilot is case-study ready only when every advertised journey passes required
layers, a second developer reproduces it, and no public claim exceeds evidence.
