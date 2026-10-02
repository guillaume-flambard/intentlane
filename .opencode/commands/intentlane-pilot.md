---
description: Advance one real IntentLane pilot from contract to measured Apple evidence
agent: build
---

Advance this pilot or evidence task: $ARGUMENTS

Read `AGENTS.md`, `.agents/product-marketing.md`, `APPLE-27-APP-INTENTS-RESEARCH.md`, `PILOT-PLAYBOOK.md`, and the pilot-specific runbook. Also read `APPLE-27-SYSTEM-SEARCH-OPEN-IMPLEMENTATION-RESEARCH.md` when Spotlight, indexed entities, onscreen entities or open behavior is involved.

Before editing, name the buyer-relevant journey this pilot proves and the exact commercial claim it may unlock. If the task does not improve audit evidence, a named implementation journey, or the evidence handoff, explain why it should be deferred.

Load `xcodebuildmcp-cli`, `app-intents-specialist` and, for SDK 26 or 27 surfaces, `app-intents-whats-new-27`. Use `swift-testing` only for test implementation.

Find the owning OpenSpec change and follow its apply instructions. Separate the evidence ladder explicitly:

1. contract generated
2. Swift compiled
3. App Intents metadata extracted
4. app built and installed
5. surface observed in Shortcuts, Spotlight or Siri
6. action executed end to end

Do not promote a claim past the highest observed step. Use `xcodebuildmcp` for Xcode build, run and logs, then follow the manual acceptance protocol in the runbook. Record failures as evidence with the exact toolchain, OS, device or simulator and command. Finish with the next action that most directly increases sellable pilot proof.
