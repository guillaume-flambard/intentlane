# Contributing to IntentLane

IntentLane audits Apple application repositories and compiles a versioned YAML
contract into App Intents Swift. The same inputs must produce the same output,
and every public claim must name the evidence that supports it.

## Before sharing anything publicly

GitHub issues, pull requests, logs, contracts, and generated files are public.
Remove proprietary source, secrets, tokens, customer data, private repository
names, usernames, and local filesystem paths before submitting them.

Do not open a public issue for a vulnerability. Follow
[SECURITY.md](.github/SECURITY.md).

## What helps most

- **Audit reports from public projects.** Include the repository revision, target
  platform, command, result, and the smallest non-confidential excerpt needed to
  reproduce the finding.
- **Contract gaps.** Show the minimal YAML shape you expected to work.
- **Diagnostics.** Name the command, diagnostic code, and why the next action was
  unclear.
- **Documentation.** Point to a statement that differs from released behavior.
- **Focused Apple evidence.** Add a fixture or test for one SDK behavior already
  in scope.

The repository does not accept Android, Flutter, Capacitor, dashboard, or SaaS
work without an approved scope change.

## Choose the right issue form

- Use the pilot form only for a non-confidential application you are allowed to
  discuss publicly.
- Use the bug form for a minimal reproducible failure.
- Use the capability proposal for a new contract or audit surface.

A question that requires private source access should start with a private
conversation, not a redacted issue that cannot be reproduced.

## Development setup

Prerequisites:

- Node.js 22 or newer.
- pnpm 11.27.0 through Corepack.
- Xcode only for Swift compilation, metadata extraction, or the example apps.

From a clean checkout:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm validate
pnpm generate --output .intentlane/generated
node packages/cli/dist/index.cjs generate --output .intentlane/generated --check
```

`.intentlane/` is not versioned. Generate once before running `--check` in a new
checkout. `pnpm build` writes the same bundled CLI shape prepared for npm.

The Expo example is a workspace fixture, not a published installation path:

```sh
cd apps/example-expo
pnpm prebuild
pnpm ios
```

## Rules the code follows

1. **Contract first.** Add valid and invalid schema fixtures before generation.
2. **No model in the build path.** Generation stays deterministic and offline.
3. **Deterministic output.** The same contract produces byte-identical files.
4. **Own only generated files.** Never rewrite application-owned business logic.
5. **No secrets in the contract.** Runtime credentials belong in the app's secure store.
6. **Test every Swift emission.** Include a focused test and a golden snapshot where applicable.
7. **Make errors actionable.** State what failed, where, and what to do next.
8. **Keep scope explicit.** A new platform or abstraction needs an exercised use case.
9. **Keep diagnostics stable.** Public diagnostic codes change only with documentation and tests.
10. **Separate evidence layers.** A green build never becomes a Siri claim.

## Pull requests

- Keep one concern per pull request.
- Explain the user-visible change and its evidence.
- Run the narrowest relevant tests, then `pnpm verify` before requesting review.
- Document every public option.
- Explain snapshot changes.
- Do not add AI attribution or generated-by trailers.
- Complete the pull request template and link a public issue when one exists.

`main` must remain green. A pull request is ready only when its automated checks
pass and any manual evidence it claims is attached.

## Working with coding agents

[AGENT-GUIDE.md](AGENT-GUIDE.md) defines the compiler boundaries and Apple naming
rules. Tools are welcome, but the contributor remains responsible for every
claim, file, and test in the submission.

By participating, you agree to follow
[CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md).
