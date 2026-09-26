import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuditReport, type AuditFinding, type AuditReport, type AuditState, type AuditTarget } from "./audit.js";
import { runAudit } from "./audit-run.js";
import { AUDIT_SCORE_BANDS, AUDIT_SIRI_DISCOVERY, scoreAuditReport } from "./audit-score.js";

const target: AuditTarget = { name: "App", platform: "macos", deploymentTarget: "27.0" };

function finding(capability: string, state: AuditFinding["state"]): AuditFinding {
  return {
    capability,
    platform: "macos",
    state,
    confidence: "low",
    evidence: [],
    requirements: [],
    gaps: [],
    nextAction: ""
  };
}

describe("audit score", () => {
  it("publishes the score contract", () => {
    expect([...AUDIT_SCORE_BANDS]).toEqual(["none", "early", "partial", "close", "ready"]);
    expect([...AUDIT_SIRI_DISCOVERY]).toEqual(["schema-backed", "shortcuts-only", "none"]);
  });

  it("scores nothing when every capability is unknown", () => {
    const report = createAuditReport(target, [
      finding("foundation.app-intent", "unknown"),
      finding("semantics.app-schema", "unknown")
    ]);
    const score = scoreAuditReport(report);

    expect(score).toMatchObject({
      score: 0,
      band: "none",
      points: 0,
      maximum: 6,
      applicable: 2,
      discovery: "none"
    });
    expect(score.counts).toMatchObject({ unknown: 2, unsupported: 0, implemented: 0, tested: 0 });
  });

  it("keeps a capability the platform does not ship out of the denominator", () => {
    const report = createAuditReport(target, [
      finding("execution.live-activity", "unsupported"),
      finding("foundation.app-intent", "implemented")
    ]);
    const score = scoreAuditReport(report);

    expect(score).toMatchObject({ applicable: 1, maximum: 3, points: 2, score: 67, band: "close" });
    expect(score.counts.unsupported).toBe(1);
  });

  it("reaches a hundred when every applicable capability is tested", () => {
    const report = createAuditReport(target, [
      finding("foundation.app-intent", "tested"),
      finding("execution.live-activity", "unsupported")
    ]);

    expect(scoreAuditReport(report)).toMatchObject({ score: 100, band: "ready", points: 3, maximum: 3 });
  });

  it("separates a shortcuts provider from a schema-backed app", () => {
    const shortcuts = scoreAuditReport(
      createAuditReport(target, [
        finding("foundation.shortcuts-provider", "implemented"),
        finding("proof.shortcuts-surface", "implemented")
      ])
    );
    expect(shortcuts.discovery).toBe("shortcuts-only");

    const schemaBacked = scoreAuditReport(
      createAuditReport(target, [
        finding("foundation.shortcuts-provider", "implemented"),
        finding("proof.shortcuts-surface", "implemented"),
        finding("proof.siri-surface", "detected")
      ])
    );
    expect(schemaBacked.discovery).toBe("schema-backed");

    const foundation = scoreAuditReport(
      createAuditReport(target, [finding("foundation.app-intent", "implemented")])
    );
    expect(foundation.discovery).toBe("none");
  });

  it("scores a real audit run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentlane-score-"));
    await mkdir(join(directory, "Sources", "App"), { recursive: true });
    await writeFile(
      join(directory, "Sources", "App", "Shortcuts.swift"),
      [
        "import AppIntents",
        "",
        "struct CreateNote: AppIntent {",
        "}",
        "",
        "struct Shortcuts: AppShortcutsProvider {",
        "  static var appShortcuts: [AppShortcut] {",
        "    AppShortcut(intent: CreateNote(), phrases: [\"Create a note\"], shortTitle: \"Create a note\", systemImageName: \"note\")",
        "  }",
        "}"
      ].join("\n"),
      "utf8"
    );

    const report = await runAudit({ directory, platform: "macos", name: "App" });
    const score = scoreAuditReport(report);

    expect(score.discovery).toBe("shortcuts-only");
    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThan(50);
    expect(score.band).toBe("early");
  });
});

describe("the score says why it moved", () => {
  const finding = (capability: string, state: AuditState): AuditFinding =>
    ({
      capability,
      platform: "macos",
      state,
      confidence: "high",
      evidence: [],
      requirements: [],
      gaps: [],
      nextAction: ""
    }) as AuditFinding;
  const report = (findings: readonly AuditFinding[]): AuditReport =>
    ({ findings, catalogue: { version: "27.0", capabilities: 38, state: "current", nextAction: "" } }) as unknown as AuditReport;

  it("carries the catalogue the score was computed against, so a score is readable across tool versions", () => {
    const scored = scoreAuditReport(report([finding("foundation.app-intent", "implemented")]));

    expect(scored.catalogueVersion).toBe("27.0");
    expect(scored.version).toBe("1.1");
  });

  it("breaks the score down by catalogue group, taking the group from the record", () => {
    const scored = scoreAuditReport(
      report([
        finding("foundation.app-intent", "implemented"),
        finding("foundation.parameters", "implemented"),
        finding("models.system-language-model", "unknown"),
        finding("models.language-model", "unknown")
      ])
    );

    expect(scored.byGroup).toEqual([
      { group: "foundation", points: 4, maximum: 6, applicable: 2, score: 67 },
      { group: "models", points: 0, maximum: 6, applicable: 2, score: 0 }
    ]);
    // The group is not parsed out of the id: an id no record owns is left out
    // rather than given an invented group.
    expect(scoreByGroupIsAbsentFor(report([finding("not.a.capability", "implemented")]))).toBe(true);
  });

  it("keeps the global number unchanged, because a breakdown is information and not a rescoring", () => {
    const findings = [finding("foundation.app-intent", "implemented"), finding("models.system-language-model", "unknown")];

    expect(scoreAuditReport(report(findings)).score).toBe(33);
  });
});

function scoreByGroupIsAbsentFor(value: AuditReport): boolean {
  return scoreAuditReport(value).byGroup.length === 0;
}
