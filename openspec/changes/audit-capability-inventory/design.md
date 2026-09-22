## Context

See proposal.md and AUDITOR-SPEC.md. Current IntentLane validates YAML and generates Swift but cannot inspect an external app.

## Goals / Non-Goals

**Goals:** local target discovery, source and metadata evidence, versioned catalogue, deterministic JSON first.

**Non-Goals:** source upload, remediation, build execution, hosted dashboard or LLM inference.

## Decisions

- Parse target configuration before Swift so deployment floor is evidence, not a guess.
- Use a versioned catalogue derived from installed SDK symbols plus explicit Apple classification.
- Keep facts and recommendations separate in JSON to prevent marketing inference from static scans.

## Risks / Trade-offs

- SDK symbols evolve → record Xcode build and catalogue version.
- Source patterns vary → emit unknown rather than a false missing finding.
