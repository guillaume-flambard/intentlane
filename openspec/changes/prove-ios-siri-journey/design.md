## Context

See the macOS pilot and PILOT-PLAYBOOK.md. iOS needs a separate device and native-build evidence path.

## Goals / Non-Goals

**Goals:** device proof, reusable differences, honest platform boundary.

**Non-Goals:** claiming macOS support from an iOS result.

## Decisions

- Reuse evidence ladder and use an independent native build.
- Treat iOS-only APIs as explicit branches in the audit.

## Risks / Trade-offs

- Signing and device state → capture conditions and preserve reproducible fixtures.
