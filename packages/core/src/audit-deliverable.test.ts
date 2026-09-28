import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderDeliverable } from "./audit-deliverable.js";
import { AUDIT_STATES, type AuditFinding, type AuditReport } from "./audit.js";
import { scoreAuditReport } from "./audit-score.js";

/// The deliverable, asserted before it exists.
///
/// A report is a machine artifact with thirteen requirements of its own. What no
/// test covered is the document a client reads: the order it presents, the
/// numbers it copies, the evidence it separates from a human observation, and the
/// boundary it states about what it did not observe.
///
/// The renderer is a pure function of reports already parsed. It reads no file,
/// spawns nothing and calls no model, so every test here runs in memory and a
/// change to the report cannot change the document by accident.
function finding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    capability: "discovery.entity-query",
    platform: "macos",
    state: "implemented",
    confidence: "high",
    evidence: [
      { kind: "swift", path: "Sources/Intent/NotebookIntent.swift", line: 42, platform: "macos" }
    ],
    requirements: ["foundation.app-intent"],
    gaps: [],
    nextAction: "Keep discovery.entity-query covered by tests.",
    ...overrides
  };
}

function report(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    reportVersion: "1.0",
    target: { name: "FSNotes", platform: "macos" },
    findings: [finding()],
    ...overrides
  } as AuditReport;
}

/// The real report the FSNotes pilot produced, read from the one committed copy in
/// `packages/studio-protocol/fixtures/`, which M2 decided is the single place the
/// real report lives. A document asserted against invented findings proves the
/// renderer runs; asserted against the real report it proves the deliverable a
/// client would receive.
function reportFixture(overrides: Partial<AuditReport> = {}): AuditReport {
  const real = readRealReport();
  return { ...real, ...overrides } as AuditReport;
}

function readRealReport(): AuditReport {
  const url = new URL("../../studio-protocol/fixtures/fsnotes-audit.json", import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as AuditReport;
}

describe("a deliverable names what the report found", () => {
  it("names the capability, the state and the evidence path of a finding", () => {
    const deliverable = renderDeliverable([report()]);

    expect(deliverable).toContain("discovery.entity-query");
    expect(deliverable).toContain("implemented");
    expect(deliverable).toContain("Sources/Intent/NotebookIntent.swift");
  });

  it("is a pure function of the report: the same report renders the same document", () => {
    const first = renderDeliverable([report()]);
    const second = renderDeliverable([report()]);
    expect(first).toBe(second);
  });

  it("names the target it audited", () => {
    expect(renderDeliverable([report()])).toContain("FSNotes");
  });

  it("renders the evidence line when the report named one", () => {
    expect(renderDeliverable([report()])).toContain("Sources/Intent/NotebookIntent.swift:42");
  });

  it("shows the next action the report carried, not one of its own", () => {
    expect(renderDeliverable([report()])).toContain("Keep discovery.entity-query covered by tests.");
  });

  it("renders a finding with no evidence without inventing any", () => {
    const deliverable = renderDeliverable([report({ findings: [finding({ evidence: [] })] })]);
    expect(deliverable).toContain("discovery.entity-query");
    // No path is rendered for a finding that named none, so the document must not
    // offer one a reader could follow.
    expect(deliverable).not.toContain(".swift:");
  });
});

describe("every number is the report's own", () => {
  it("copies the score, its points and its maximum rather than recomputing them", () => {
    // The comparison is against the engine's own score for the same report, so a
    // renderer that re-derived the figure would be caught even when its arithmetic
    // happened to agree.
    const report = reportFixture();
    const score = scoreAuditReport(report);
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain(`Compatibility score ${score.score}/100`);
    expect(deliverable).toContain(`band ${score.band}`);
    expect(deliverable).toContain(`${score.points} of ${score.maximum} points`);
    expect(deliverable).toContain(`${score.applicable} applicable capabilities`);
    expect(deliverable).toContain(`${score.discovery} discovery`);
  });

  it("holds on a report whose score is unusual", () => {
    // A renderer that happened to agree on a typical report would pass a test that
    // only ever used one. This report scores at the top of the range, so a renderer
    // with its own idea of the arithmetic has nowhere to hide.
    const report = reportFixture({
      findings: [
        finding({ capability: "proof.siri-surface", state: "tested" }),
        finding({ capability: "semantics.app-schema", state: "tested" }),
        finding({ capability: "models.private-cloud", state: "implemented" }),
        finding({ capability: "entity.collection", state: "unsupported" })
      ]
    });
    const score = scoreAuditReport(report);
    expect(score.score, "this report must not score like the ordinary one").toBeGreaterThan(0);

    const deliverable = renderDeliverable([report]);
    expect(deliverable).toContain(`Compatibility score ${score.score}/100`);
    expect(deliverable).toContain(`${score.points} of ${score.maximum} points`);
  });

  it("counts the findings per state from the report, not from a fixed table", () => {
    const report = reportFixture({
      findings: [
        finding({ capability: "a.one", state: "unknown" }),
        finding({ capability: "a.two", state: "unknown" }),
        finding({ capability: "b.one", state: "unknown" }),
        finding({ capability: "c.one", state: "implemented" })
      ]
    });
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("unknown: 3");
    expect(deliverable).toContain("implemented: 1");
    expect(deliverable).toContain("unsupported: 0");
  });

  it("shows a zero for a state the report has none of", () => {
    // A column missing is a question the reader is not allowed to ask, and a
    // state the report declares but did not find is information.
    const deliverable = renderDeliverable([reportFixture({ findings: [] })]);
    for (const state of AUDIT_STATES) {
      expect(deliverable, `${state} has no column in the document`).toContain(`${state}: 0`);
    }
  });
});

describe("every block the report carries reaches the document", () => {
  it("renders route, data, architecture, quality, conditions, catalogue and targets", () => {
    // A block added to the report later, and not to the renderer, would otherwise
    // disappear from the client's document with nothing failing.
    const report = reportFixture({
      route: {
        route: "native",
        confidence: "medium",
        evidence: [{ kind: "swift", path: "Sources/Open.swift" }],
        nextAction: "Keep the schema action declared."
      },
      data: {
        classes: ["personal"],
        indexed: true,
        privacy: "declared",
        evidence: [],
        nextAction: ""
      },
      architecture: {
        architecture: "local",
        confidence: "high",
        evidence: [],
        nextAction: ""
      },
      quality: { signals: ["result"], issues: ["an issue"], evidence: [], nextAction: "" },
      conditions: { conditions: [{ name: "architecture", state: "recorded" }], nextAction: "" },
      catalogue: { version: "27.0", capabilities: 51, state: "current", nextAction: "" },
      targets: { targets: [{ name: "app", files: ["a.swift"], folders: [] }], scoped: true, nextAction: "" },
      overlay: { version: "1.0", consumption: [{ capability: "x", consumption: "used", priority: "now" }], unknown: ["y"], nextAction: "" },
      sdk: { version: "27.0", canonicalName: "arm64-apple-macos" }
    }) as unknown as AuditReport;

    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("Integration route: native");
    expect(deliverable).toContain("personal");
    expect(deliverable).toContain("Architecture: local");
    expect(deliverable).toContain("1 signal(s), 1 issue(s)");
    expect(deliverable).toContain("an issue");
    expect(deliverable).toContain("Test conditions: 1 recorded");
    expect(deliverable).toContain("Capability catalogue 27.0");
    expect(deliverable).toContain("Build targets: 1");
    expect(deliverable).toContain("Consumer overlay 1.0");
    expect(deliverable).toContain("arm64-apple-macos");
  });
});

describe("each platform is answered on its own", () => {
  function reportFor(platform: "macos" | "ios"): AuditReport {
    return {
      reportVersion: "1.0",
      target: { name: "MyApp", platform },
      findings: [
        finding({
          capability: `discovery.entity-query`,
          platform,
          state: "implemented",
          evidence: [{ kind: "swift", path: `Sources/${platform}/App.swift`, line: 1 }]
        })
      ]
    } as AuditReport;
  }

  it("gives two audited platforms two sections", () => {
    const deliverable = renderDeliverable([reportFor("macos"), reportFor("ios")]);
    expect(deliverable).toContain("macOS");
    expect(deliverable).toContain("iOS");
    expect(deliverable).toContain("Sources/macos/App.swift");
    expect(deliverable).toContain("Sources/ios/App.swift");
  });

  it("makes no statement about a platform that was not audited", () => {
    // Auditing one platform says nothing about the other, and a document that
    // merged them would let a reader believe an iOS result from a macOS run.
    const deliverable = renderDeliverable([reportFor("macos")]);
    expect(deliverable).toContain("macOS");
    expect(deliverable).not.toContain("Sources/ios/App.swift");
  });
});

describe("Shortcuts is not Siri", () => {
  it("renders a Shortcuts-only finding without a Siri or Apple Intelligence claim", () => {
    const report = reportFixture({
      findings: [
        finding({
          capability: "semantics.shortcuts-only-schema",
          state: "implemented",
          evidence: [{ kind: "swift", path: "Sources/AppShortcuts.swift" }]
        })
      ]
    });
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("semantics.shortcuts-only-schema");
    // The document states the boundary, so the words appear once, in the limits.
    // What it must not do is attach them to the finding.
    const findingLine = deliverable
      .split("\n")
      .find((line) => line.includes("semantics.shortcuts-only-schema"));
    expect(findingLine).toBeDefined();
    expect(findingLine!.toLowerCase()).not.toContain("siri");
    expect(findingLine!.toLowerCase()).not.toContain("apple intelligence");
  });
});

describe("an undecided capability stays undecided", () => {
  it("renders an unknown finding as undecided and not as unsupported or implemented", () => {
    const report = reportFixture({
      findings: [finding({ capability: "models.private-cloud", state: "unknown" })]
    });
    const deliverable = renderDeliverable([report]);

    const line = deliverable
      .split("\n")
      .find((candidate) => candidate.includes("**models.private-cloud**"));
    expect(line).toBeDefined();
    expect(line).toContain("unknown");
    expect(line).not.toContain("unsupported");
    expect(line).not.toContain("implemented");
  });

  it("says an undecided capability is undecided, in words a reader cannot miss", () => {
    const report = reportFixture({ findings: [finding({ state: "unknown" })] });
    const deliverable = renderDeliverable([report]);
    expect(deliverable).toContain("undecided");
    // And it says what undecided is not, because that is the reading that turns
    // an audit into a verdict nobody made.
    expect(deliverable).toContain("not a negative result");
  });
});

describe("the human section", () => {
  it("is present, and empty of anything the audit produced", () => {
    const report = reportFixture({ findings: [finding(), finding({ capability: "a.two" })] });
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("What a person observed");
    // No finding may appear in the human section: an automated result rendered
    // there is an observation nobody made.
    const humanSection = deliverable.slice(deliverable.indexOf("What a person observed"));
    // Up to the next heading, not from it: this is the human section's own text.
    const humanText = humanSection.slice(0, humanSection.indexOf("What this document does not say"));
    expect(humanText).not.toContain("discovery.entity-query");
    expect(humanText).not.toContain("a.two");
    expect(humanText).toContain("Not yet observed.");
  });

  it("states that the audit observed nothing", () => {
    const deliverable = renderDeliverable([reportFixture()]);
    expect(deliverable).toContain("does not observe");
  });
});

describe("the boundary travels with the document", () => {
  it("states the audit is read-only and local", () => {
    const deliverable = renderDeliverable([reportFixture()]);
    expect(deliverable).toContain("read-only");
    expect(deliverable).toContain("local");
  });

  it("states that an absence is reported as unknown, not missing", () => {
    const deliverable = renderDeliverable([reportFixture()]);
    expect(deliverable).toContain("unknown");
    expect(deliverable).toContain("not a negative result");
  });

  it("states that Siri behaviour was not observed", () => {
    const deliverable = renderDeliverable([reportFixture()]);
    expect(deliverable).toContain("Nothing here was observed on a device");
    expect(deliverable).toContain("Siri");
  });
});

describe("what the deliverable refuses to do", () => {
  it("declares no capability the report does not name", () => {
    // A capability absent from the report is not a gap in the deliverable, it is
    // simply not mentioned: the audit did not classify it and the document does
    // not claim to have.
    const deliverable = renderDeliverable([report()]);
    expect(deliverable).not.toContain("semantics.app-schema");
    expect(deliverable).not.toContain("models.foundation-model");
  });

  it("renders a state the report produced and no other", () => {
    const deliverable = renderDeliverable([
      report({ findings: AUDIT_STATES.map((state) => finding({ state })) })
    ]);
    for (const state of AUDIT_STATES) {
      expect(deliverable, `the report's state ${state} is not rendered`).toContain(state);
    }
    // `verified` is not a state the report produces, so the document must not
    // have a column for it.
    expect(deliverable).not.toContain("verified");
  });
});
