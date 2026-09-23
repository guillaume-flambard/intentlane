import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AuditDiffError,
  diffAuditDocuments,
  diffAuditReports,
  formatDeltaJson,
  formatDeltaText,
  parseAuditDocument,
  parseAuditText
} from "./audit-diff.js";
import { createAuditReport, type AuditFinding } from "./audit.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "audit-diff");
const read = (name: string): string => readFileSync(join(fixtures, name), "utf8");

const finding = (
  capability: string,
  platform: "macos" | "ios",
  state: AuditFinding["state"]
): AuditFinding => ({
  capability,
  platform,
  state,
  confidence: "high",
  evidence: [],
  requirements: [],
  gaps: [],
  nextAction: ""
});

describe("parseAuditDocument", () => {
  it("accepts a single report document", () => {
    const reports = parseAuditDocument(JSON.parse(read("baseline.json")));
    expect(reports).toHaveLength(1);
    expect(reports[0]?.target.platform).toBe("macos");
  });

  it("accepts a reports collection produced by --platform both", () => {
    const reports = parseAuditDocument(JSON.parse(read("both-baseline.json")));
    expect(reports.map((report) => report.target.platform).sort()).toEqual(["ios", "macos"]);
  });

  it("rejects an unknown report version with ILA171", () => {
    try {
      parseAuditDocument(JSON.parse(read("unsupported-version.json")));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuditDiffError);
      expect((error as AuditDiffError).code).toBe("ILA171");
    }
  });

  it("rejects a document without findings with ILA170", () => {
    try {
      parseAuditDocument({ reportVersion: "1.0" });
      expect.unreachable();
    } catch (error) {
      expect((error as AuditDiffError).code).toBe("ILA170");
    }
  });
});

describe("parseAuditText", () => {
  it("rejects invalid JSON with ILA170", () => {
    try {
      parseAuditText(read("invalid.json"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuditDiffError);
      expect((error as AuditDiffError).code).toBe("ILA170");
    }
  });

  it("emits no partial delta on invalid input", () => {
    try {
      diffAuditDocuments(JSON.parse(read("baseline.json")), read("invalid.json"));
      expect.unreachable();
    } catch (error) {
      expect((error as AuditDiffError).code).toBe("ILA170");
      expect((error as AuditDiffError).delta).toBeUndefined();
    }
  });
});

describe("diffAuditReports", () => {
  it("reports a progression when a state rises along the public order", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-progression.json")));
    const kinds = delta.entries.map((entry) => entry.kind);
    expect(kinds).toContain("progression");
    expect(kinds).not.toContain("regression");
    expect(delta.progressions).toBe(2);
    expect(delta.regressions).toBe(0);
  });

  it("reports a regression when a state falls along the public order", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-regression.json")));
    expect(delta.regressions).toBeGreaterThan(0);
    const entry = delta.entries.find((item) => item.capability === "foundation.app-intent");
    expect(entry?.kind).toBe("regression");
    expect(entry?.baselineState).toBe("detected");
    expect(entry?.candidateState).toBe("unknown");
  });

  it("keeps an added capability unclassified, never a progression", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-added.json")));
    const entry = delta.entries.find((item) => item.capability === "semantics.schema-entity");
    expect(entry?.kind).toBe("added");
    expect(delta.progressions).toBe(0);
    expect(delta.added).toBe(1);
  });

  it("keeps a removed capability unclassified, never a regression", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-removed.json")));
    const entry = delta.entries.find((item) => item.capability === "semantics.app-schema");
    expect(entry?.kind).toBe("removed");
    expect(delta.regressions).toBe(0);
    expect(delta.removed).toBe(1);
  });

  it("joins on platform and capability and ignores target names", () => {
    const delta = diffAuditDocuments(JSON.parse(read("both-baseline.json")), JSON.parse(read("both-candidate.json")));
    expect(delta.entries).toHaveLength(1);
    expect(delta.entries[0]).toMatchObject({ platform: "macos", capability: "foundation.app-intent", kind: "progression" });
  });

  it("rejects a platform present on one side only with ILA172", () => {
    try {
      diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("ios-only.json")));
      expect.unreachable();
    } catch (error) {
      expect((error as AuditDiffError).code).toBe("ILA172");
    }
  });

  it("is deterministic across repeated runs", () => {
    const baseline = JSON.parse(read("baseline.json"));
    const candidate = JSON.parse(read("candidate-progression.json"));
    const first = diffAuditDocuments(baseline, candidate);
    const second = diffAuditDocuments(JSON.parse(JSON.stringify(baseline)), JSON.parse(JSON.stringify(candidate)));
    expect(first).toEqual(second);
    expect(formatDeltaText(first)).toBe(formatDeltaText(second));
    expect(formatDeltaJson(first)).toBe(formatDeltaJson(second));
  });

  it("orders entries by platform then capability", () => {
    const baseline = createAuditReport({ name: "App", platform: "macos" }, [
      finding("semantics.b", "macos", "detected"),
      finding("foundation.a", "macos", "detected")
    ]);
    const candidate = createAuditReport({ name: "App", platform: "macos" }, [
      finding("semantics.b", "macos", "implemented"),
      finding("foundation.a", "macos", "implemented")
    ]);
    const delta = diffAuditReports([baseline], [candidate]);
    expect(delta.entries.map((entry) => entry.capability)).toEqual(["foundation.a", "semantics.b"]);
  });

  it("reports changed sdk, catalogue, conditions and target as context without ranking", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-context.json")));
    expect(delta.entries).toHaveLength(0);
    const scopes = delta.context.map((change) => change.scope);
    expect(scopes).toContain("target");
    expect(scopes).toContain("sdk");
    expect(scopes).toContain("conditions");
    for (const change of delta.context) {
      expect(change.kind).toBe("context");
    }
    expect(delta.regressions).toBe(0);
    expect(delta.progressions).toBe(0);
  });

  it("derives changed scores from the reports without comparing them as proof", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-progression.json")));
    expect(delta.scores).toHaveLength(1);
    expect(delta.scores[0]?.platform).toBe("macos");
    expect(delta.scores[0]?.candidate.points).toBeGreaterThan(delta.scores[0]?.baseline.points ?? 0);
  });
});

describe("formatDelta", () => {
  it("renders a stable text delta", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-progression.json")));
    expect(formatDeltaText(delta)).toBe(formatDeltaText(delta));
    expect(formatDeltaText(delta)).toContain("progression");
    expect(formatDeltaText(delta)).toMatchSnapshot();
  });

  it("renders a parseable JSON delta", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-progression.json")));
    const parsed = JSON.parse(formatDeltaJson(delta)) as { entries: unknown[] };
    expect(parsed.entries).toHaveLength(delta.entries.length);
    expect(formatDeltaJson(delta)).toBe(formatDeltaJson(delta));
    expect(formatDeltaJson(delta)).toMatchSnapshot();
  });

  it("renders changed context in both formats", () => {
    const delta = diffAuditDocuments(JSON.parse(read("baseline.json")), JSON.parse(read("candidate-context.json")));
    expect(formatDeltaText(delta)).toContain("context");
    const parsed = JSON.parse(formatDeltaJson(delta)) as { context: unknown[] };
    expect(parsed.context.length).toBeGreaterThan(0);
    expect(formatDeltaText(delta)).toMatchSnapshot();
  });
});
