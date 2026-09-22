import { describe, expect, it } from "vitest";
import { createAuditReport, type AuditFinding } from "./audit.js";
import { formatReports } from "./audit-format.js";

const finding = (platform: "macos" | "ios"): AuditFinding => ({
  capability: "foundation.app-intent",
  platform,
  state: "implemented",
  confidence: "high",
  evidence: [{ kind: "swift", path: "Sources/App/Notes.swift", line: 3 }],
  requirements: [],
  gaps: [],
  nextAction: ""
});

const macos = createAuditReport({ name: "App", platform: "macos" }, [finding("macos")]);
const ios = createAuditReport({ name: "App", platform: "ios" }, [finding("ios")]);

describe("formatReports", () => {
  it("separates the text sections and names each platform", () => {
    const rendered = formatReports([macos, ios], "text");
    expect(rendered.startsWith("report macos\n")).toBe(true);
    expect(rendered).toContain("\nreport ios\n");
    expect(rendered.match(/report macos/g)).toHaveLength(1);
    expect(rendered.match(/report ios/g)).toHaveLength(1);
  });

  it("wraps the JSON output in a reports collection", () => {
    const parsed = JSON.parse(formatReports([macos, ios], "json")) as {
      reports: readonly { target: { platform: string }; score: { score: number } }[];
    };
    expect(parsed.reports).toHaveLength(2);
    expect(parsed.reports.map((report) => report.target.platform)).toEqual(["macos", "ios"]);
    expect(parsed.reports[0]?.score.score).toBe(67);
  });

  it("keeps one SARIF document with one run per platform", () => {
    const parsed = JSON.parse(formatReports([macos, ios], "sarif")) as {
      version: string;
      runs: readonly { tool: { driver: { name: string } } }[];
    };
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toHaveLength(2);
    expect(parsed.runs[0]?.tool.driver.name).toBe("IntentLane");
  });
});
