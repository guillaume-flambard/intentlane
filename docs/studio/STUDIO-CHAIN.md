# The Studio chain, M0 to M8

## Why this file exists

The master spec that carried the M numbering was never committed. Only three of
its milestones were ever named in the repository: M0 in
[M0-ENGINE-PROTOCOL.md](M0-ENGINE-PROTOCOL.md), M2 in the capability map
proposal, and M6 in the same protocol document. The other numbers lived in one
conversation and would have been lost with it.

This file reconstructs the chain from what the repository actually holds, so the
next reader inherits a sequence instead of a rumour. Every milestone below
cites the object it comes from. A number the repository named is kept. A number
I derived is marked **derived**, and can be renumbered without loss, because
what carries the meaning is the evidence and the gate, not the digit.

The chain is the buyer's path, in order: qualify, audit, map, choose, build,
prove, hand over, then run it again. Each link earns the next, and a link that
cannot be earned does not get built.

| Milestone | What it is | Where it stands |
|---|---|---|
| M0 Engine protocol | The window launches the same CLI the reader would launch, and reads the same journal | **done**, descriptive. [M0-ENGINE-PROTOCOL.md](M0-ENGINE-PROTOCOL.md) |
| M1 The audit as a stage | The window runs the audit itself, holds the report, and states its preflight first | **derived**. Half-built: `AuditExecutor.swift` exists and `openCapabilities()` calls it, but the audit has no stage of its own |
| M2 Capability map | The report rendered as ten groups, filterable, with the findings row and its evidence | **done**, named. [studio-capability-map](../../openspec/specs/studio-capability-map/spec.md), 3 requirements |
| M3 The audit deliverable | The document a client reads: what the app can do, what is next, what is not proven | **derived**. Unowned: the engine produces a report, no client reads it |
| M4 Which journeys to implement | The named journeys come from the audit, and only when they are useful and feasible | **derived**. Half-built: the goal and plan screens are contract-derived |
| M5 Implementation and adapters | A bounded sprint that runs in the customer's worktree, with customer-owned adapters | **derived**. [add-asri-adapter-templates](../../openspec/changes/add-asri-adapter-templates/tasks.md), 7 of 16 |
| M6 Test Lab | A named journey run on a device, with what a person did not verify still visible | **named in the repository**, never asked for. M0 calls it the second candidate |
| M7 Evidence handoff | The ledger travels with the delivery, and refuses to call automated results Siri proof | **derived**. [pilot-evidence-ledger](../../openspec/specs/pilot-evidence-ledger/spec.md), 5 requirements |
| M8 Recurring verification | The second run of the same audit on the same repository | **derived**, and explicitly not an offer |

## What each gate takes

**M0, engine protocol.** Already true by construction: the shell launches the
same binary the CLI launches, and reads the report through the same schema. The
second half of the gate, a framing protocol with a question per second, stays
unbuilt on purpose. It is not owed anything until a milestone names a second
question per second, and none of the eight below does.

**M1, the audit as a stage.** The window states where it will read, which
engine it will launch, and that the audit is read-only, then holds the parsed
report rather than a bool. The preflight is the part that matters: an audit
that runs against the wrong worktree produces a report about a repository the
client does not ship.

**M2, capability map.** Closed. 51 findings in 10 catalogue groups, the report's
own score, a count of every declared state including the two this report has
none of, a filter row, the original findings row beside a selected node, and
`xed` at the line the report named. A capability the report does not name
cannot appear.

**M3, the audit deliverable.** The gap this fills is narrow and the rule is
strict. The engine's report is already a complete machine artifact, with 13
requirements of its own in
[capability-audit](../../openspec/specs/capability-audit/spec.md). What does not
exist is the client-facing reading of it. The gate is that every number in the
deliverable is copied from the report and never recomputed, that machine
evidence and human evidence sit in separate places, and that a capability the
audit could not decide is stated as undecided rather than resolved. A
deliverable that paraphrases the report into a score the tool did not produce
has failed the gate even if it reads well.

**M4, which journeys to implement.** The commercial rule already exists: a
sprint follows only when the audit identifies a journey that is both useful and
feasible. The gate is that the named journeys come from the audit's own route
qualification, not from a catalogue the client could have read themselves.

**M5, implementation and adapters.** The gate is that business lookup,
permissions, navigation and side effects stay in customer-owned code, and that
the generator never re-implements a step the engine already owns.

**M6, Test Lab.** The result screen already carries what a person did not
verify. The gate is that a named journey is run on a real device and the
observation is recorded as a human one, never merged into the automated set.

**M7, evidence handoff.** The publication gate is already specified and already
strict. The gate here is that the ledger is part of the delivery rather than an
internal artifact the client never receives.

**M8, recurring verification.** Not an offer. The chain stops at M7 until a paid
audit has been delivered twice, and only then does a second run on the same
repository earn its place. [observe-the-live-system](../../openspec/changes/observe-the-live-system/tasks.md)
is 19 of 22 and stays paused.

## Why the next link is M3 and not M1

The chain order is the buyer's order. The build order is chosen by what is due.

The public-surface milestone is one reproducible external audit and one bounded implementation proposal
sent. M3 is the document that offer is made of, and the capability map from M2
is what makes it credible in the same meeting: a real report, real groups, a
real score, and a stated boundary about what is not proven. M1 is a
prerequisite that M2 already half-satisfies, and the map is honest without it,
because the screen states the absence instead of filling it.

So M3 is the next link, and it is a document, not a subsystem.

## What this file is not

It is not a commitment for M1 or M3 to M8. Each of those arrives with its own
OpenSpec change, its own red test, and its own gate, the way M2 did. Three
milestones carry no number this file could not derive from the repository:
`add-mcp-action-plane` (0 of 31) is not on this chain, because a second
question per second is not a milestone anyone has been asked for; the iOS
journey proof belongs to M6 rather than to a milestone of its own; and
`package-validated-service` is the packaging of the offer, not a step in it.
