import { describe, expect, it } from "vitest";
import {
  AUDIT_DIAGNOSTIC_CODES,
  AUDIT_STATES,
  blockingGaps,
  compareFindings,
  createAuditReport,
  type AuditFinding
} from "./audit.js";

const finding = (
  capability: string,
  state: AuditFinding["state"],
  confidence: AuditFinding["confidence"] = "high"
): AuditFinding => ({
  capability,
  platform: "macos",
  state,
  confidence,
  evidence: [],
  requirements: [],
  gaps: [],
  nextAction: ""
});

describe("audit contract", () => {
  it("publishes the documented report contract", () => {
    expect([...AUDIT_STATES]).toEqual(["unsupported", "unknown", "detected", "implemented", "tested", "feasible"]);
    expect([...AUDIT_DIAGNOSTIC_CODES]).toEqual([
      "ILA100",
      "ILA110",
      "ILA120",
      "ILA130",
      "ILA140",
      "ILA150",
      "ILA160"
    ]);
  });

  it("orders findings deterministically", () => {
    const report = createAuditReport({ name: "App", platform: "macos", deploymentTarget: "27.0" }, [
      finding("schema.system.open", "feasible"),
      finding("foundation.app-intent", "implemented"),
      finding("discovery.indexed-entity", "unknown")
    ]);
    expect(report.findings.map((item) => item.capability)).toEqual([
      "discovery.indexed-entity",
      "foundation.app-intent",
      "schema.system.open"
    ]);
    expect(createAuditReport(report.target, report.findings)).toEqual(report);
  });

  it("matches the report snapshot", () => {
    expect(
      createAuditReport({ name: "App", platform: "macos", deploymentTarget: "27.0" }, [
        finding("schema.system.open", "feasible")
      ])
    ).toMatchSnapshot();
  });

  it("returns only high confidence gaps as blockers", () => {
    const withGap = (confidence: AuditFinding["confidence"]): AuditFinding => ({
      ...finding("schema.system.open", "detected", confidence),
      gaps: [{ code: "ILA120", message: "No schema-conformant open intent found." }]
    });
    const report = createAuditReport({ name: "App", platform: "macos" }, [withGap("high"), withGap("low")]);
    expect(blockingGaps(report)).toEqual([
      { code: "ILA120", message: "No schema-conformant open intent found." }
    ]);
  });
});

describe("compareFindings", () => {
  it("breaks ties on the state rank", () => {
    expect(compareFindings(finding("same", "unsupported"), finding("same", "feasible"))).toBeLessThan(0);
    expect(compareFindings(finding("same", "feasible"), finding("same", "unsupported"))).toBeGreaterThan(0);
  });
});
