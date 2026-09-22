## 1. Discovery and contract

- [x] 1.1 Define report types, states and stable `ILA` diagnostics; verify JSON fixture snapshots.
- [x] 1.2 Discover Xcode, Swift package and Expo targets without writes; verify worktree hash is unchanged.
- [x] 1.3 Add SDK catalogue and macOS/iOS availability tests.

## 2. Evidence and CLI

- [x] 2.1 Detect App Intents, shortcuts, schemas, entities, tests and metadata; verify positive and negative fixtures.
- [x] 2.2 Implement text, JSON and SARIF output; verify deterministic output.
- [x] 2.3 Add `intentlane audit --strict`; verify high-confidence blockers return non-zero.

## 3. Verification

- [x] 3.1 Audit the existing macOS fixture; verify metadata is tested but Siri is unverified.
- [x] 3.2 Run `pnpm test`, `pnpm build` and `git diff --check`.
