## Context

The first proof targets a content app and a bounded discovery, open and safe-action sequence. See PILOT-PLAYBOOK.md.

## Goals / Non-Goals

**Goals:** reproducibility, external-app evidence, a reusable audit rule.

**Non-Goals:** upstream merge, universal Siri control, production-data access.

## Decisions

- Use an isolated fork and fixture data.
- Prefer system search/open only where the model legitimately fits.
- Capture manual Siri evidence after automated and system-surface checks.

## Risks / Trade-offs

- OS conditions vary → record hardware, locale, permissions and OS build.
