## Context

Select a domain after pilot demand, starting with System search/open only if its public schema requirements fit.

## Goals / Non-Goals

**Goals:** complete contract, customer-owned adapter, negative validation and system proof.

**Non-Goals:** implementing the entire Apple schema catalogue.

## Decisions

- Model each domain as a package with its own IR extension and fixtures.
- Reject unsupported partial contracts instead of fallback custom intents.

## Risks / Trade-offs

- Schema evolution → pin SDK evidence and add availability fixtures.
