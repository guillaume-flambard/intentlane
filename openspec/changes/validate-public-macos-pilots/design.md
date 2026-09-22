## Context

NetNewsWire is native macOS and iOS with meaningful reader logic. FSNotes is a second native local-content case. CST Reader remains a later bridge case and is excluded from this change.

## Goals / Non-Goals

**Goals:** isolate pilot work, compare audit deltas, capture reproducible macOS evidence.

**Non-Goals:** external outreach, upstream contribution, public catalogue or production account access.

## Decisions

- Use local RSS and note fixtures so the evidence is repeatable and privacy-safe.
- Run NetNewsWire before FSNotes to test discovery and a state-changing reader action.
- Treat every current statement about their App Intents support as a baseline-audit hypothesis.

## Risks / Trade-offs

- App architecture can block a schema fit → stop with evidence and choose another candidate.
- Read state is mutable → use fixture reset and explicit confirmation behavior.
