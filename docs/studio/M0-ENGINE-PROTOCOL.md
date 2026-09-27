# M0: Studio Engine Protocol

Status: **descriptive**. This describes the protocol that already runs, written
from the code rather than in front of it, and names what is missing before a
process-level JSON-RPC replacement would be justified. The proposed master spec
asked for this document to be written *before* a GUI existed. The GUI already
exists, so this document starts from what the shell does today and is stricter
about what it has not yet earned.

M0 has no goal of its own: M0 is the contract that keeps the Native Shell from
becoming a second engine. Everything below exists to make that failure
impossible to express.

## The three invariants M0 protects

These exist in the running shell today, not as proposals.

**1.1 The engine is the authority, and the shell launches rather than reimplements it.**

`apps/studio/Sources/StudioCore/Executor.swift` runs
`intentlane pilot run` as a child process and takes the engine's steps as the
sequence of a run:

```swift
/// Runs `intentlane pilot run` and reads the journal it writes. The engine is
/// never reimplemented here: this launches it, collects what it printed, and
/// reads `.intentlane/run/journal.json` back through the same schema.
```

The window has no audit logic, no scoring and no capability graph. A screen that
invented a score would be a second engine, and the shell is built so that a
screen cannot draw what the engine did not say.

**1.2 Four kinds of information are typed apart, and the window must never mix them.**

`RunReport` carries them as four separate fields, and its header comment is the
statement of the invariant:

```swift
/// The four kinds of information the window must never mix. Progress is what the
/// engine did, observations are what the tools said, verdicts come from the
/// existing engine, and human validation is what nobody has done yet.
```

That is the spec's `FACT / PROPOSAL / DECISION / OBSERVATION` separation, already
enforced by the type. `RunOutcome` is also kept distinct from what a run achieved,
because the header says so and three of its cases are explicit stop reasons:

```swift
/// How a run ended, kept distinct from what it achieved. A quota, a delay or a
/// cancellation is a stopped run, and a window that renders it as an integration
/// is lying about the result.
```

**1.3 No capability is promised outside the ladder the engine declares.**

`RunStepID` and `RunStepStatus` are typed to `pilotRunJournalSchema`, and
`Journal.swift` declines to relax the schema, in its own opening lines:

```swift
/// The run journal, typed exactly as `pilotRunJournalSchema` in
/// `packages/schema/src/index.ts` declares it.
///
/// The schema is the authority. This file does not relax it: the two invariants
/// the schema enforces are enforced here too, because a window that shows a
/// passed step with no evidence is showing a completion that did not happen, and
/// a window that shows a blocked step with no reason is hiding the one thing the
/// reader needs.
```

The scaffold `RunStepID.allCases` gives `declaredSequence`, so a screen can state
the sequence without offering `prepare → implement → deliver` sooner than the
engine's own step list does. The screen-level `headline` resolves to exactly three
values, `integrated`, `prepared` or `stopped(reason:)`, and the last is what a run
nobody reached the end of looks like.

## The real protocol, as it runs

The protocol today is **one CLI invocation per step, inside an isolated worktree,
with a Kubernetes-style typed result**. There is no long-lived process to
handshake with, because there is no second question being asked while a run is
open.

| Stage | What happens | Typed by |
| --- | --- | --- |
| engine located | the bundled engine resolves without touching `PATH` | `RunOutcome.engineMissing` |
| worktree | an isolated worktree is created; the current branch is untouched | `Worktree.swift`, `RunOutcome.worktreeUnavailable` |
| run | `intentlane pilot run` executes; `stdout` is consumed and fire-hosed into the UI | `RunProgress(step:status:line:at:)` |
| read-back | `.intentlane/run/journal.json` is read and typed against the same `pilotRunJournalSchema` | `Journal.swift` |
| edges | `cancel`, timeout, missing engine, empty journal, failing engine and a shot-down provider are each decoded into a distinct outcome | `RunOutcome` |
| proof | the contract named the entity and the intent names are the ones the engine built, never an invented list | `IntegrationContract.swift` |

The shell carries **no global daemon**. There is no port, no socket, no
long-running process to restart. The isolation is a **process already there**;
it is a snapshot, not a session, and Studio relies on that property rather than
re-engineering it.

## What is deliberately missing, and why

These are the named gaps, recorded so a reader can see that absence by design
rather than by omission.

### There is no `ProjectIndex`

The Master Spec's M0 asks for an indexed workspace, with hashes, sizes, mtimes,
languages and per-run facts. The shell has **none of it**, because the one thing
Studio currently asks the engine for is an audit, and the engine owns the audit.

| What the spec asks for | Status in the running shell |
| --- | --- |
| `workspace.open` / `workspace.snapshot` | not needed; the whole repository is passed as a worktree, and the engine maps it |
| fingerprinting and hashing | the worktree is disposable and reconstructed from scratch, so a fingerprint is a rerun |
| `files: IndexedFile[]` | not asked; the engine already scans |
| `facts: ProjectFacts` | not asked; `Preflight.swift` records what the *app needs to know before the run starts* |

This is the cleanest way to say what M0 *should* eventually add: a ProjectIndex
becomes valuable the instant the window wants to **answer two questions per
second**, and that is not the request a pilot run makes. M0 v1 stays one-shot,
because a one-shot run is what produces one journal and one diff.

### There is no streaming control channel

The executor's `onLine` is invoked per line as `stdout` splashes out of the
process. There is no cancellation *into* the engine, only control from the top
(`Cancellation.swift`), and the carve-out already exists in `RunOutcome.cancelled`
with the message *"Cancelled. The journal below is what the run had reached."*

| What the spec asks for | Status in the running shell |
| --- | --- |
| `audit.progress` notification | a `line` stream the UI buckets by current step; **not** parsed into phases |
| cancellation mid-run | a cancellation *token from the top*, not a control message *into* the engine |
| `system.shutdown` | not needed; the process ends with the run |

### There is no `EngineProcess` actor, and it is the biggest gap the spec asks for

This is what the running shell would grow to if it wanted to ask the engine more
than one thing per user action. It is named here so that a reader can see the
scope and know that the shell does not do it yet. `Executor.swift` uses a
synchronous `Process` behind a `@Sendable` closure, and the UI reads the stream
back instead of owning the handle.

| What the spec asks for | Status in the running shell |
| --- | --- |
| an `EngineProcess` actor | **no**; a `Process` wrapped in a `@Sendable` closure |
| captured `stderr` | **partly**: the stderr is collected into the outcome |
| port capturing | **no**; no port |
| restart after crash | **no**; the run WriteOff is surfaced and the shark decision is the user's |

## Where a JSON-RPC layer would come from, if it ever does

The Master Spec axes JSON-RPC 2.0 over stdio, one JSON message per line, no
local HTTP server, no port, no global daemon, an engine process that is a child
of the app.

**The reasons that rule is right, and the reasons it is not the first step.**

1. The engine process the shell launches is **already** an untrusted child of
   the app, and the one-shot CLI is a simpler contract than a long-lived RPC
   session. A one-shot run is a recovery boundary for free: a crash is a
   non-zero exit and a missing journal, and the shell already has eight
   distinguishable outcomes for exactly that.

2. **The second reason the rule is premature** is that nothing in the five
   screens currently wants two questions in the same second. Studio runs the
   engine once, shows the result, and the user either runs again or files the
   gap: the shell keeps a single invocation, and the screen called
   *Work*, is a collapsed log, not a live pane.

3. **A JSONL contract that frames every message as "JSON per line" is work the
   shell's current schema does not share.** The engine writes a journal *file*
   on side-effect, and that file is what the typed read-back reads. `journal.json` is the
   concrete once-per-run artifact, good for the "second audit is deterministic"
   and "audit identical CLI vs Studio engine" gates the spec asks for, but a
   typed read-back is a read-only contract and not an invocation contract.

## Gate de sortie, and what its success takes

The Master Spec's M0 gate:

```text
studio-engine
→ ouvre apps/example-macos
→ run audit
→ retourne exactement les mêmes données que le CLI
→ run verify
→ retourne les mêmes gates
```

**The gate that exists today passes the "same data" half of this**, and
`RealRunTests.swift` is the *condition for it to run at all*:

> `INTENTLANE_STUDIO_REPO` must point at a checkout that has a real run journal.
> Without it the screens that show a real run are not drawn rather than drawn
> from a fixture, and the run and result screens are absent rather than faked.

That is the `workspace path invalid` test the spec lists, at a design level. What
still has to be written to close the gate is the **second** half:

| Spec test | Written today? | What it would take |
| --- | --- | --- |
| framing JSONL | no | no JSONL framing exists; the protocol is one-shot CLI |
| messages incomplets / JSON invalide | no | no framing, so nothing to split |
| méthode inconnue | no | the engine is invoked with fixed arguments; it cannot receive an unknown method |
| cancellation | **yes**, from the top | `Cancellation.swift` and the `cancel` outcome cover the token-from-the-top path |
| crash engine | **partly**, as a distinct `RunOutcome` | eight outcomes distinguish a stopped run from a finished one |
| protocol mismatch | no | there is no handshake to mismatch |
| workspace path invalid | **yes** | `Preflight.swift` rejects without starting |
| second audit déterministe | **partly** | the journal is typed and used twice, but there is no `audit.diff` read-back yet |
| aucune sortie non-JSON sur stdout | **no** | the CLI *is* the JSON boundary, and the shell reads the journal, not stdout |
| audit identique CLI vs Studio engine | **yes**, by construction | the shell launches the same CLI, so the report is the CLI's |

Nothing is invented to close the other rows. A gate that is half green and
half "no path" is a gate that has not been settled, and the shell says so rather
than filling the gap in.

## What M0 turns into, and what it must not turn into

M0 stays descriptive until a product justification **names** which deliverable
adds the second question per second. The obvious candidates are the Master
Spec's M2 (a Capability Map that filters or re-binds a finding) and M6 (a Test
Lab), but neither has been asked for outside a document yet, and each of them
will arrive with its own OpenSpec change if it arrives.

**It must not become a place where Studio reimplements a step that the engine
already owns.** The shell's honest statement is one line, and it is worth quoting
because it is the reason the invariant is safe in code and not only in prose:

```swift
/// Runs `intentlane pilot run` and reads the journal it writes. The engine is
/// never reimplemented here: this launches it, collects what it printed, and
/// reads `.intentlane/run/journal.json` back through the same schema.
```
