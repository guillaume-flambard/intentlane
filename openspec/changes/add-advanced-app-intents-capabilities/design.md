## Context

The order is IndexedEntity and queries, transfer, relevance and context, sync and ownership, rich values, then long-running execution.

## Goals / Non-Goals

**Goals:** incremental packages with proof and auditability.

**Non-Goals:** a single universal YAML abstraction.

## Decisions

- Keep each capability independently versioned and availability guarded.
- Require application adapters for data lifecycle and execution.

## Risks / Trade-offs

- Sensitive index data → explicit privacy evidence and opt-in policy.
