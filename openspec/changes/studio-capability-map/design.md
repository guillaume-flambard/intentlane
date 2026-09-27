# M2: Capability Map

The discipline this change carries is the shell's, extended to the audit report:
**the JSON is the authority and the window reads it verbatim.** The proposed master
spec named eight groups (`Foundation, Semantics, Discovery, Execution, Cross-app,
Models, Safety, Proof`). The real catalogue has ten
(`foundation, semantics, entity, parameters, models, discovery, cross-app,
relevance, execution, proof`). M2 renders the real ten and leaves the proposed
eight to the document that invented them.

## Context

`packages/core/src/audit.ts` already exposes the exact data M2 needs:

```ts
export type AuditFinding = Readonly<{
  capability: string;
  platform: AuditPlatform;
  state: AuditState;
  confidence: AuditConfidence;
  evidence: readonly AuditEvidence[];
  requirements: readonly string[];
  gaps: readonly AuditGap[];
  nextAction: string;
}>;

export type AuditReport = Readonly<{ findings: readonly AuditFinding[]; [...] }>;
```

and the master spec's own `CapabilityNode` model is the same shape, so the
mapping is **one function from the one to the other**, with no invention. Even the
states align (the report's `feasible` is a bounded work state the spec did not name
but which M3 will want).

## Goals and Non-Goals

**Goals:** a deterministic map function; a read-only macOS screen rendered from
that map; traceable evidence per node.

**Non-Goals:** no invented groups, no importance scoring beyond the report's own
`confidence`, no extra engine query, no JSON-RPC, no Siri verdict that the report
does not carry.

## Decisions

1. **`packages/studio-protocol` owns the mapping as a pure function, so the map
   is testable without an app.** The shell can use it at runtime by importing it
   once it has a real audit report. The function is a derivation; it does not
   read the filesystem, call the engine, or `JSON.parse` anything that is not
   already parsed.
2. **Group comes from the `capability`'s own first dot-separated fragment.**
   The report's `capability` id is dotted, the catalogue's `CAPABILITY_GROUPS`
   names ten groups and every finding's group prefixes map onto it. A finding
   whose group is not in the catalogue renders under an explicit `other` group
   rather than being silently dropped: it is still a finding.
3. **States match the report, not the spec diagram's diagram.** The report has
   six states, the spec's diagram has five. The map's six states are the report's
   six, and a `tested` question renders as `tested`, not as "tested". A `verified`
   state does not exist in this audit's output, so the map declares no such state.
4. **The inspector traces back to the findings row verbatim.** No invented
   evidence is generated from a search over other rows.

## Risks and trade-offs

- **A screen that summarizes can hide the record.** Every node keeps a link to
  its findings row, and the Inspector opens the *original* row (capability id,
  confidence, gaps, evidence, next action) rather than a summary.
- **The shell renders 51 findings today. A real project could have 200.** The
  map is deterministic and cheap per node. `CAPABILITY_GROUPS` bounds the tree at
  ten root children, so the fallback is always a group by group view.

## Test plan

- The map function has its own Vitest suite, with one real audit fixture and
  synthetic variants for a missing group, a missing evidence path, an unknown
  group, and a finding that has an empty `evidence`.
- The screen has a real-run test, mirroring `RealRunTests.swift`, which requires
  `INTENTLANE_STUDIO_REPO` and *absently* renders nothing rather than a fixture
  when no real data exists, because a screen that renders a fixture looks like a
  real run.
- Every state the map supports is exercisable through a fixture, and no state in
  the report fails to render.
