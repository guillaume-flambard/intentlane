---
description: Implement one scoped IntentLane Apple task with the right specs and Xcode verification
agent: build
---

Work on this scoped IntentLane task: $ARGUMENTS

1. Read `AGENTS.md`, `README.md`, `.agents/product-marketing.md`, `AGENT-GUIDE.md` and `SPEC.md`.
2. State which audit deliverable, named customer journey, or evidence gate the task improves. Defer it when no link exists unless the owner explicitly changes scope.
3. Inspect `git status` and preserve all unrelated work.
4. Identify the OpenSpec change that owns the task. Run `openspec list --json`, then `openspec status --change <name> --json` and `openspec instructions apply --change <name> --json`. Read every returned context file. If ownership is ambiguous, stop and present the smallest set of plausible changes.
5. Load `xcodebuildmcp-cli` and `app-intents-specialist`. Load `app-intents-whats-new-27` only when SDK 26 or 27 APIs are involved. Load `swift-testing` or `swift-concurrency` only when the task needs them.
6. Read the narrow Apple reference needed for the symbols in play. Never generate an API from memory alone.
7. Implement the smallest complete vertical change. Start contract changes in the schema and invalid fixtures, preserve deterministic generation, and update golden snapshots only when the behavior is intentional.
8. Run focused tests first. Use `xcodebuildmcp` help-first for direct Xcode work. Run the applicable repository verification from `AGENTS.md` before completion.
9. Report changed files, commands and results, the exact observed Apple evidence, remaining unknowns, and the next dependency-correct task. Do not claim Siri or Spotlight behavior from compilation alone.
