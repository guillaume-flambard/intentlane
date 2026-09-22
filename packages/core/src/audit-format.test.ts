import { describe, expect, it } from "vitest";
import { createAuditReport, type AuditFinding } from "./audit.js";
import { AUDIT_FORMATS, formatJson, formatReport, formatSarif, formatText } from "./audit-format.js";

const cleanFinding: AuditFinding = {
  capability: "foundation.app-intent",
  platform: "macos",
  state: "implemented",
  confidence: "medium",
  evidence: [{ kind: "swift", path: "Sources/App/Notes.swift", line: 13 }],
  requirements: [],
  gaps: [],
  nextAction: ""
};

const openFinding: AuditFinding = {
  capability: "semantics.app-schema",
  platform: "macos",
  state: "detected",
  confidence: "high",
  evidence: [{ kind: "swift", path: "Sources/App/Notes.swift", line: 4 }],
  requirements: ["AppEntity(schema:)"],
  gaps: [{ code: "ILA120", message: "No schema-conformant open intent found." }],
  nextAction: "Implement the domain package."
};

const report = createAuditReport({ name: "App", platform: "macos", deploymentTarget: "27.0" }, [
  openFinding,
  cleanFinding
]);

describe("audit output formats", () => {
  it("publishes the supported formats", () => {
    expect([...AUDIT_FORMATS]).toEqual(["text", "json", "sarif"]);
  });

  it("renders a stable text report", () => {
    const expected = [
      "target App (macos 27.0)",
      "macos implemented foundation.app-intent (medium)",
      "macos detected semantics.app-schema (high)",
      "  ILA120 No schema-conformant open intent found.",
      "  next: Implement the domain package.",
      ""
    ].join("\n");

    expect(formatText(report)).toBe(expected);
    expect(formatText(report)).toBe(formatText(report));
  });

  it("renders the report as parseable JSON", () => {
    expect(JSON.parse(formatJson(report))).toEqual(report);
    expect(formatJson(report)).toBe(formatJson(report));
  });

  it("renders SARIF results from the gaps", () => {
    const sarif = JSON.parse(formatSarif(report));

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.name).toBe("IntentLane");
    expect(sarif.runs[0].tool.driver.rules).toEqual([{ id: "ILA120" }]);
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].ruleId).toBe("ILA120");
    expect(sarif.runs[0].results[0].level).toBe("error");
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      "Sources/App/Notes.swift"
    );
  });

  it("dispatches through the requested format", () => {
    expect(formatReport(report, "text")).toBe(formatText(report));
    expect(formatReport(report, "json")).toBe(formatJson(report));
    expect(formatReport(report, "sarif")).toBe(formatSarif(report));
  });
});
