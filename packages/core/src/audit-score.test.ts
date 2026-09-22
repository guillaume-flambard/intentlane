import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuditReport, type AuditFinding, type AuditTarget } from "./audit.js";
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
        finding("semantics.app-schema", "implemented")
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
