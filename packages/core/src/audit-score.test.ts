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
        finding("proof.siri-surface", "detected")
      ])
    );
    expect(schemaBacked.discovery).toBe("schema-backed");

    const foundation = scoreAuditReport(
      createAuditReport(target, [finding("foundation.app-intent", "implemented")])
    );
    expect(foundation.discovery).toBe("none");
  });

  it("moves the denominator but no observed fact when the catalogue describes more", () => {
    // Describing more capabilities is something the tool did, not something the
    // project changed, so nothing the project actually did may move because of
    // it. The score is a ratio and the denominator therefore does grow; the
    // points, the discovery and the observed counts are the facts a client
    // reads, and they are pinned here so a future catalogue addition cannot
    // quietly rewrite a report.
    const observed = [
      finding("semantics.schema-intent", "implemented"),
      finding("semantics.schema-entity", "implemented"),
      finding("discovery.entity-query", "implemented"),
      finding("discovery.indexed-entity", "detected"),
      finding("proof.siri-surface", "detected"),
      finding("execution.live-activity", "unsupported")
    ];
    const before = scoreAuditReport(createAuditReport(target, observed));
    const described = [
      ...observed,
      ...["entity.file", "entity.collection", "parameters.union", "models.system-language-model", "models.tool"].map((capability) =>
        finding(capability, "unknown")
      )
    ];
    const after = scoreAuditReport(createAuditReport(target, described));

    expect(after.applicable).toBe(before.applicable + 5);
    expect(after.maximum).toBe(before.maximum + 15);
    expect({
      points: after.points,
      discovery: after.discovery,
      implemented: after.counts.implemented,
      detected: after.counts.detected,
      unsupported: after.counts.unsupported
    }).toEqual({
      points: before.points,
      discovery: before.discovery,
      implemented: before.counts.implemented,
      detected: before.counts.detected,
      unsupported: before.counts.unsupported
    });
    // The ratio falls, and that is a fact about the catalogue's size, not a
    // regression in the project. The score is reported next to the denominator
    // so a reader can see which of the two moved.
    expect(after.score).toBeLessThan(before.score);
  });

  it("lets a band fall without the project changing, which is why the denominator is published", () => {
    // The band is not invariant, and pretending otherwise would be a test that
    // lies. An app sitting near a band boundary sees the band fall purely
    // because IntentLane learned to describe something new. This is a fact about
    // the metric that a client has to be able to see, so the score is always
    // reported next to the applicable count and the maximum it was divided by.
    const observed = [
      finding("semantics.schema-intent", "implemented"),
      finding("semantics.schema-entity", "implemented"),
      finding("discovery.entity-query", "implemented"),
      finding("discovery.indexed-entity", "detected"),
      finding("proof.siri-surface", "detected"),
      finding("execution.live-activity", "unsupported")
    ];
    const before = scoreAuditReport(createAuditReport(target, observed));
    const after = scoreAuditReport(
      createAuditReport(target, [
        ...observed,
        ...Array.from({ length: 5 }, (_, index) => finding(`models.described-${index}`, "unknown"))
      ])
    );

    expect(before.band).toBe("partial");
    expect(after.band).toBe("early");
    expect(after.points).toBe(before.points);
    // Nothing about the project changed, so the report has to carry enough for a
    // reader to tell the difference between the app moving and the catalogue
    // moving. Both numbers are in the score for exactly this.
    expect({ applicable: after.applicable, maximum: after.maximum }).not.toEqual({
      applicable: before.applicable,
      maximum: before.maximum
    });
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
