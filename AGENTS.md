# IntentLane agent instructions

IntentLane is the active product and commercial focus. Work from the existing repository and preserve unrelated changes from other sessions.

## Product position

IntentLane is a fixed-scope Apple Intelligence audit and implementation offer for teams that already ship an iOS or macOS app. The buyer needs to know which named Siri, Spotlight, Shortcuts, or Apple Intelligence journeys are useful, feasible, missing, and proven before committing a sprint.

Use `.agents/product-marketing.md` as the source for audience, positioning, objections, language, and commercial goals. Before adding a capability, state which audit deliverable, named implementation journey, or evidence gate it improves. If it improves none of them, defer it unless the owner explicitly changes the product scope.

The current commercial sequence is: fixed-scope audit, bounded implementation when justified, then evidence handoff. Do not turn future Studio, SaaS, marketplace, MCP, or recurring Observe ideas into active scope without validated demand.

## Read order

1. Read `README.md` for the measured project status.
2. For product, marketing, offer, or scope decisions, read `.agents/product-marketing.md`.
3. Read `AGENT-GUIDE.md` for product boundaries and Apple naming rules.
4. For implementation, inspect `openspec list --json`, select the relevant change, then read the files returned by `openspec instructions apply --change <name> --json`.
5. Treat `SPEC.md` as the normative IntentLane contract.
6. Load only the Apple research or pilot runbook needed by the task. Do not inject every research file into a small change.

`docs/INDEX.md` maps every document that is not at the root, by theme. The
repository root holds six files and nothing else: if a document is not one of
them, look it up in that index rather than guessing a path.

For Apple 27 audits and pilots, start with `docs/apple/APPLE-27-APP-INTENTS-RESEARCH.md`, then the relevant files among `docs/apple/APPLE-SCHEMA-REFERENCE.md`, `docs/apple/APPLE-27-SYSTEM-SEARCH-OPEN-IMPLEMENTATION-RESEARCH.md`, `docs/spec/AUDITOR-SPEC.md`, `docs/apple/SIRI-27-ROADMAP.md`, `docs/pilots/PILOT-PLAYBOOK.md`, and the pilot-specific runbook.

## OpenCode skills

Load skills on demand:

- `xcodebuildmcp-cli` for build, test, run, logs and Xcode discovery.
- `app-intents-specialist` for all App Intents implementation and review.
- `app-intents-whats-new-27` for APIs introduced or changed in SDK 26 or 27.
- `swift-testing` when writing or reviewing Swift tests.
- `swift-concurrency` when actor isolation, `Sendable`, tasks or async execution are involved.

Do not load all skills by default. App Intents work normally needs the first three. Add testing or concurrency only when the task reaches those concerns.

## Apple workflow

Use the `xcodebuildmcp` CLI for direct Xcode build, test, run and log work. Discover the exact command with `xcodebuildmcp --help`, `xcodebuildmcp tools`, and workflow help before running it. Repository verification scripts may invoke Apple command line tools directly and remain authoritative.

Never invent an App Intents symbol or availability. Read the relevant skill reference and the installed SDK before emitting code. Keep stable intent type names, entity identifiers, enum raw values and shortcut phrases compatible unless the active specification explicitly authorizes a breaking change.

## Implementation rules

- Use the existing OpenSpec change instead of creating a parallel plan.
- Start new syntax in the schema, invalid fixtures and normalized IR.
- Keep generation deterministic and offline.
- Give every generated Swift change a focused test and a golden snapshot where applicable.
- Do not hand-edit generated output or Xcode project files.
- Keep routine work sequential. Do not create an agent team or worktree automatically.
- Do not stage, commit, revert or reformat unrelated files from another session.

## Verification

Run the narrowest focused tests first. Before calling an integration batch complete, run the applicable commands from `README.md`:

```sh
pnpm test
pnpm build
pnpm validate
pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check
node apps/example-macos/verify.mjs
```

For a real pilot, automated checks do not replace the manual Siri, Spotlight or Shortcuts acceptance steps in its runbook. Record observed evidence and unknowns separately.
