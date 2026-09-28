import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DELIVERABLE_GROUPS,
  derivedCapabilityGroup,
  renderDeliverable,
  type ScoredAuditReport
} from "./audit-deliverable.js";
import { AUDIT_STATES, type AuditFinding, type AuditReport } from "./audit.js";
import { CAPABILITY_GROUPS } from "./audit-catalogue.js";
import { scoreAuditReport, type AuditScore } from "./audit-score.js";

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

function countsOf(states: readonly string[]): Record<string, number> {
  const counts = Object.fromEntries(AUDIT_STATES.map((state) => [state, 0])) as Record<string, number>;
  for (const state of states) counts[state] = (counts[state] ?? 0) + 1;
  return counts;
}

/// A score that is deliberately not the score these findings would earn.
///
/// This is the whole point of the fixture. A test that hands the renderer a
/// report and then checks the document against `scoreAuditReport` of the same
/// report passes even if the renderer computes its own score, because the two
/// agree by construction. A score that could not be earned by this report is
/// caught by any renderer that recomputes, and copied faithfully by one that
/// reads.
function impossibleScore(): AuditScore {
  return {
    version: "1.0",
    score: 99,
    band: "close",
    points: 3,
    maximum: 7,
    applicable: 2,
    catalogueVersion: "test-catalogue",
    byGroup: [],
    counts: countsOf(["tested", "tested", "tested", "implemented", "unknown", "unsupported"]),
    discovery: "test-only-discovery"
  } as unknown as AuditScore;
}

function scored(report: AuditReport, score?: AuditScore): ScoredAuditReport {
  return {
    ...report,
    score: score ?? {
      version: "1.0",
      score: 0,
      band: "none",
      points: 0,
      maximum: 150,
      applicable: 50,
      catalogueVersion: "test-catalogue",
      byGroup: [],
      counts: countsOf(report.findings.map((one) => one.state)),
      discovery: "schema-backed"
    } as unknown as AuditScore
  };
}

function report(overrides: Partial<AuditReport> = {}): ScoredAuditReport {
  return scored(
    {
      reportVersion: "1.0",
      target: { name: "FSNotes", platform: "macos" },
      findings: [finding()],
      ...overrides
    } as AuditReport
  );
}

/// The real report the FSNotes pilot produced, read from the one committed copy in
/// `packages/studio-protocol/fixtures/`, which M2 decided is the single place the
/// real report lives. A document asserted against invented findings proves the
/// renderer runs; asserted against the real report it proves the deliverable a
/// client would receive.
function reportFixture(overrides: Partial<AuditReport> = {}, score?: AuditScore): ScoredAuditReport {
  return scored({ ...readRealReport(), ...overrides } as AuditReport, score ?? readRealReport().score);
}

function readRealReport(): ScoredAuditReport {
  const url = new URL("../../studio-protocol/fixtures/fsnotes-audit.json", import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as ScoredAuditReport;
}

describe("a deliverable names what the report found", () => {
  it("names the capability, the state and the evidence path of a finding", () => {
    const deliverable = renderDeliverable([report()]);

    expect(deliverable).toContain("FSNotes");
    expect(deliverable).toContain("**discovery.entity-query**: implemented, high confidence");
    expect(deliverable).toContain("Sources/Intent/NotebookIntent.swift");
    expect(deliverable).toContain("Keep discovery.entity-query covered by tests.");
  });

  it("names the line a piece of evidence is on, because a path alone sends a reader hunting", () => {
    const deliverable = renderDeliverable([report()]);
    expect(deliverable).toContain("Sources/Intent/NotebookIntent.swift:42");
  });

  it("prints no line number it was not given", () => {
    // Evidence with a path and no line is still evidence, and inventing a line
    // would send a reader to a place the audit never looked.
    const deliverable = renderDeliverable([
      report({ findings: [finding({ evidence: [{ kind: "swift", path: "Sources/App.swift" }] })] })
    ]);
    expect(deliverable).toContain("evidence: Sources/App.swift");
    expect(deliverable).not.toContain(".swift:");
  });
});

describe("every number is the report's own", () => {
  it("copies a score it could not have computed", () => {
    // The score here is one no arithmetic over these findings could produce: the
    // renderer would have to invent it, and the document still has to say it. That
    // is the difference between a document describing a report and a document
    // describing a second opinion about the same code.
    const score = impossibleScore();
    const report = scored(
      { reportVersion: "1.0", target: { name: "Lied", platform: "macos" }, findings: [finding()] } as AuditReport,
      score
    );

    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("Compatibility score 99/100");
    expect(deliverable).toContain("band close");
    expect(deliverable).toContain("3 of 7 points");
    expect(deliverable).toContain("2 applicable capabilities");
    expect(deliverable).toContain("test-only-discovery discovery");
  });

  it("does not silently substitute its own arithmetic for a strange score", () => {
    // The same report scored by the engine, for contrast. The document must not
    // carry this number anywhere.
    const report = reportFixture();
    const engineScore = scoreAuditReport(report);
    expect(engineScore.score, "this fixture must not earn the impossible score").not.toBe(99);

    const deliverable = renderDeliverable([report]);
    expect(deliverable).toContain(`Compatibility score ${report.score.score}/100`);
    expect(deliverable).not.toContain("Compatibility score 99/100");
  });

  it("copies the real report's own figures", () => {
    const report = reportFixture();
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain(`Compatibility score ${report.score.score}/100`);
    expect(deliverable).toContain(`band ${report.score.band}`);
    expect(deliverable).toContain(`${report.score.points} of ${report.score.maximum} points`);
    expect(deliverable).toContain(`${report.score.applicable} applicable capabilities`);
    expect(deliverable).toContain(`${report.score.discovery} discovery`);
  });

  it("copies the per-state counts rather than counting the findings again", () => {
    // The report says three unknown; the findings below number one. A renderer
    // that tallied would print one and contradict the report it is describing.
    const score = { ...impossibleScore(), counts: countsOf(["unknown", "unknown", "unknown", "implemented", "unknown", "unknown"]) };
    const report = scored(
      {
        reportVersion: "1.0",
        target: { name: "Counted", platform: "macos" },
        findings: [finding({ capability: "a.one", state: "unknown" })]
      } as AuditReport,
      score as unknown as AuditScore
    );

    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain("unknown: 5");
    expect(deliverable).toContain("implemented: 1");
    expect(deliverable).toContain("unsupported: 0");
  });

  it("shows a zero for a state the report declares as none", () => {
    // A column missing is a question the reader is not allowed to ask, and a
    // state the report declares zero of is information. The score here declares
    // every state at zero, which is a report that found nothing rather than a
    // report whose score was left behind by another report's findings.
    const empty = {
      ...impossibleScore(),
      score: 0,
      band: "none",
      counts: countsOf([])
    } as unknown as AuditScore;
    const report = scored(
      { reportVersion: "1.0", target: { name: "Nothing", platform: "macos" }, findings: [] } as AuditReport,
      empty
    );

    const deliverable = renderDeliverable([report]);

    for (const state of AUDIT_STATES) {
      expect(deliverable, `${state} has no column in the document`).toContain(`${state}: 0`);
    }
  });

  it("keeps a count the report states even when its findings do not show it", () => {
    // The real report, whose score counts 51 findings and whose `findings` array
    // has been emptied here. The score is the report's statement, and the
    // document repeats it rather than second-guessing a figure it was handed.
    const report = reportFixture({ findings: [] });
    const deliverable = renderDeliverable([report]);

    expect(deliverable).toContain(`unknown: ${report.score.counts.unknown}`);
    expect(report.score.counts.unknown).toBeGreaterThan(0);
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
    } as unknown as AuditReport);

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

  it("prints nothing for a block the report leaves out", () => {
    // Absence stays an absence: a renderer that invented a section for a block the
    // report did not carry would be describing an audit that did not happen.
    const report = reportFixture();
    const deliverable = renderDeliverable([report]);

    expect(deliverable).not.toContain("Integration route:");
    expect(deliverable).not.toContain("Architecture:");
    expect(deliverable).not.toContain("Consumer overlay");
  });
});

describe("each platform is answered on its own", () => {
  function reportFor(platform: "macos" | "ios"): ScoredAuditReport {
    return scored({
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
    } as AuditReport);
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

describe("the groups are the catalogue's, and there is one list of them", () => {
  it("files a finding under the group the catalogue names", () => {
    for (const group of CAPABILITY_GROUPS) {
      expect(derivedCapabilityGroup(`${group}.something`), group).toBe(group);
    }
  });

  it("files a finding the catalogue does not name under other, and keeps it", () => {
    // Dropping it would lose a finding; folding it into a known group would file it
    // somewhere the audit never put it.
    expect(derivedCapabilityGroup("mystery.thing")).toBe("other");
    const deliverable = renderDeliverable([
      report({ findings: [finding({ capability: "mystery.thing" })] })
    ]);
    expect(deliverable).toContain("**mystery.thing**");
    expect(deliverable).toContain("#### other");
  });

  it("has no group list of its own", () => {
    // The renderer used to carry a second copy of the ten names. The order it
    // prints them in is the catalogue's order plus `other`, asserted here against
    // the catalogue itself rather than against a second literal.
    expect([...DELIVERABLE_GROUPS]).toEqual([...CAPABILITY_GROUPS, "other"]);
  });

  it("prints groups in the catalogue's order, not the findings' order", () => {
    const deliverable = renderDeliverable([
      report({
        findings: [
          finding({ capability: "proof.siri-surface" }),
          finding({ capability: "foundation.app-intent" }),
          finding({ capability: "discovery.entity-query" })
        ]
      })
    ]);
    const order = ["#### foundation", "#### discovery", "#### proof"].map((headingText) =>
      deliverable.indexOf(headingText)
    );
    expect(order.every((at) => at >= 0), "a group is missing from the document").toBe(true);
    const sorted = [...order].sort((a, b) => a - b);
    expect(order, `groups printed out of order: ${order}`).toEqual(sorted);
  });

  it("omits a group the report has nothing for, because the document is about this project", () => {
    const deliverable = renderDeliverable([
      report({ findings: [finding({ capability: "foundation.app-intent" })] })
    ]);
    expect(deliverable).toContain("#### foundation");
    expect(deliverable).not.toContain("#### proof");
  });
});

describe("the document is a function of its input and nothing else", () => {
  it("renders the same report to the same text", () => {
    const first = renderDeliverable([reportFixture()]);
    const second = renderDeliverable([reportFixture()]);
    expect(first).toBe(second);
  });

  it("ends with a newline, so a diff of two deliveries is about content", () => {
    const deliverable = renderDeliverable([reportFixture()]);
    expect(deliverable.endsWith("\n"), "a file without a final newline reads as a truncated delivery").toBe(true);
  });
});
