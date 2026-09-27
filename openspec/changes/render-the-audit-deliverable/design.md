# M3: The audit deliverable, design

## Context

See `proposal.md` for the motivation. What the implementation has to work with:

- `AuditReport` in `packages/core/src/audit.ts` is the whole machine artifact,
  and `capability-audit` already specifies it with 13 requirements: findings,
  target, score, route, data, architecture, conditions, quality, catalogue,
  targets, overlay.
- `packages/core/src/audit-format.ts` renders `text`, `json` and `sarif`.
  `formatText` is a flat dump, one line per finding, and it is consumed by
  scripts and by a human in a terminal. It is not a document.
- The CLI already has `audit --output <file>`, so a written report is a normal
  artifact of the tool today.
- The real FSNotes report is committed at
  `packages/studio-protocol/fixtures/fsnotes-audit.json`, and M2 decided it
  lives in exactly one place so a second copy cannot drift.
- `openspec/changes/studio-capability-map` established that the ten capability
  groups come from the catalogue and not from a second invented list, and that a
  Swift mirror and a TypeScript implementation must not be able to disagree.

## Goals / Non-Goals

Design-level boundaries only. The scope is in `proposal.md`.

- The renderer takes already-parsed reports. It performs no I/O, so its
  behaviour is testable without a filesystem and without a project.
- The document is generated, not authored. No template file, no partials, no
  placeholders filled from a second source.

## Decisions

**1. A separate command that reads a written report, not a fourth audit format.**

`intentlane deliverable <rapport.json> [--out <fichier>]`.

Considered: adding `deliverable` to `AUDIT_FORMATS`. Rejected, twice over. It
would change the command contract documented in `docs/spec/AUDITOR-SPEC.md` and
turn a client document into a report format, which it is not. It would also
force a `MODIFIED` delta on `capability-audit`, so that the report spec would
have to describe a document it does not produce. As a separate command, the
deliverable can be re-rendered from a report the client already has, without
re-running an audit, and `capability-audit` stays untouched.

Considered: rendering it in the Studio window, as M2 did for the map. Rejected:
the deliverable is the artifact that leaves the building. A window is where you
read a report, not what you send.

**2. Markdown.**

Considered: HTML or PDF. Rejected: both add a dependency and a build step for a
document whose content is text and tables. Considered: plain text, matching
`formatText`. Rejected: headings and tables are the point of a document a
manager reads, and `formatText` already covers the terminal case.

**3. The group derivation moves into core, and `studio-protocol` imports it.**

The deliverable groups capabilities so the document speaks the client's
language, and the natural order is the catalogue's own ten groups. Writing that
list a second time inside the renderer would recreate exactly the drift M2's
test was built to catch: two lists of ten names that a screen cannot see
disagreeing with a client. So the derivation lives in core beside the catalogue,
`studio-protocol`'s mapping imports it, and the M2 test keeps guarding the one
list. This touches a capability whose requirements do not change, so no
`MODIFIED` delta is needed.

**4. The human section is rendered empty, and stays empty.**

The deliverable carries a section where a person records what they observed,
and the renderer writes the heading and nothing under it. A generated document
that filled that section would be claiming an observation nobody made. Accepting
a human observation as input is a later change, and a deliberately separate one.

**5. Unreadable input is refused, never rendered around.**

A report that does not parse exits non-zero, names the file, and writes
nothing. A partial deliverable that looks complete is worse than a failure,
because a client cannot tell the difference.

## Risks and trade-offs

- [The document reads well and is still wrong] → Every number is copied from the
  report, and a test asserts the score line carries the report's own values
  rather than a recomputation. No prose asserts a figure the report does not
  carry.
- [The deliverable drifts from the report as the report grows] → A test renders
  a report carrying every optional block and asserts each one appears, so a new
  block cannot be added to the report and silently left out of the document.
- [The document is in English] → Section titles are English and the capability
  ids, states and evidence paths are the report's own, so nothing is
  mistranslated. If a client reads French, the renderer takes a locale and the
  titles follow; that is a later change and it does not alter any requirement
  here. Recorded as a limitation rather than pretended away.
- [A client reads the score as a quality judgement] → The score is presented
  with its band, its points and its maximum, and the claim boundary states that
  absence is `unknown` rather than `missing`, so a low score cannot be read as
  a verdict on the team.
- [The renderer becomes a second audit engine] → It reads parsed reports and
  derives nothing but ordering and wording. The test suite pins that: no finding
  disappears, no state is invented, no count is recomputed.

## Migration Plan

None. The change is additive: a new module, a new command, a new spec. No
existing format, no existing command and no existing report changes shape, so
there is nothing to roll back beyond deleting the new files.

## Open Questions

- Whether the client wants Markdown or a PDF is answerable later without
  changing a requirement: it affects the extension and the post-step, not the
  content.
- Whether the human observation section should be filled by the Studio shell or
  by the reader in a text editor is answerable later; the renderer leaves the
  choice open by writing an empty section.
