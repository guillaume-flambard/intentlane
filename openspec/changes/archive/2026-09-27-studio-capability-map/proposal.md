# M2: Capability Map

## Why

An audit produces one JSON list of 51 findings, and an engineering lead cannot
tell from a list which Apple surface is behind which gap or what to do next. The
buyer's five questions in the master spec are answerable from the report, and the
running macOS shell has the platform to render them. M2 is the first feature that
stacks on the shell: **a read-only capability map rendered strictly from the audit
report, with no data the report does not contain.**

The shell already carries the discipline that makes this safe: `RunReport` types
observations, progress, verdicts and human validation apart; `Journal.swift`
declines to relax the engine's schema; and the launch header says the engine is
never reimplemented. M2 extends that rule to the audit's own JSON: the map is a
view over the report, and a capability a report does not name cannot appear in
the window.

## What Changes

- Add a TypeScript **`studio-protocol`** package: the deterministic mapping from
  an `AuditReport` to a `CapabilityNode` tree, exported as a pure function with
  no rendering dependency, so both the shell and any future engine-consumer can
  read it.
- Add the **Capabilities** screen to the existing macOS shell, rendering the tree.
- Order groups from the catalogue's own `CAPABILITY_GROUPS`, not from a new list
  of invented groups.
- Traceability rule: every node renders the evidence path and line from its
  findings row, and a node with no evidence renders no evidence.
- Open in Xcode via `xed`, using the finding's own path and line.

## Capabilities

### New Capabilities

- `studio-capability-map`: The capability map rendered deterministically from an
  audit report.

### Modified Capabilities

- Aucun.

## Impact

`packages/studio-protocol` (new), `apps/studio` (one screen), the existing audit
JSON as the authority.

## Non-Goals

- No invented groups, no similarity or importance scoring beyond the
  `confidence` the report already carries, no stats the JSON does not have
  (nothing derives `87% likely to work`).
- No new engine method in this change. The capability map reads the JSON the
  engine already produces, so a second engine question per second still is not
  required and no JSON-RPC layer is added.
- No new visual language: the same `Theme` and `ScreenScroll` the shell already
  uses.
