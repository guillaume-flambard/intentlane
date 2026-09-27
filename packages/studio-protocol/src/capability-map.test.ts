import { describe, expect, it } from "vitest";
import { capabilityTree } from "./capability-map.js";
import type { AuditFinding, AuditReport } from "../../../core/src/audit.js";

const version = "1.0";

function report(findings: AuditFinding[]): AuditReport {
  return {
    reportVersion: version,
    target: { name: "MyApp", platform: "macos", deploymentTarget: "12.0" },
    findings
  };
}

function finding(partial: Partial<AuditFinding> & { capability: string }): AuditFinding {
  return {
    capability: partial.capability,
    platform:partial.platform ?? "macos",
    state: partial.state ?? "unknown",
    confidence: partial.confidence ?? "low",
    evidence: partial.evidence ?? [],
    requirements: partial.requirements ?? [],
    gaps: partial.gaps ?? [],
    nextAction: partial.nextAction ?? ""
  };
}

const one = finding({
  capability: "discovery.entity-query",
  state: "implemented",
  confidence: "high",
  evidence: [{ kind: "swift", path: "Article.swift", line: 41, platform: "macos" }] as never,
  requirements: ["foundation.app-intent"],
  gaps: [{ code: "ILA140", message: "Dependency failed" }] as never,
  nextAction: "Keep discovery.entity-query covered by tests and extracted metadata."
});

describe("capability map", () => {
  it("a single finding becomes one node under its catalogue group, copied verbatim", () => {
    const tree = capabilityTree(report([one]));
    expect(tree.reportVersion).toBe(version);
    expect(tree.platform).toBe("macos");
    expect(tree.groups).toHaveLength(1);

    const [bucket] = tree.groups;
    expect(bucket.id).toBe("discovery");
    expect(bucket.nodes).toEqual([
      expect.objectContaining({
        id: "discovery.entity-query",
        group: "discovery",
        state: "implemented",
        confidence: "high",
        nextAction: "Keep discovery.entity-query covered by tests and extracted metadata."
      })
    ]);
  });

  it("two findings in the same group stay in source order", () => {
    const first = finding({ capability: "discovery.entity-query", state: "implemented" });
    const second = finding({ capability: "discovery.indexed-entity", state: "detected" });
    const tree = capabilityTree(report([first, second]));

    expect(tree.groups).toHaveLength(1);
    expect(tree.groups[0].nodes.map((node) => node.id)).toEqual([
      "discovery.entity-query",
      "discovery.indexed-entity"
    ]);
  });

  it("a finding whose group is not in the catalogue lands in other, last", () => {
    const listed = finding({ capability: "discovery.entity-query" });
    const unlisted = finding({ capability: "unlisted.thing" });
    const tree = capabilityTree(report([unlisted, listed]));

    // `unlisted` is not a catalogue group, so it produces an `other` bucket that
    // comes after the known ones, and the finding it carries is unchanged.
    const ids = tree.groups.map((group) => group.id);
    expect(ids).toEqual(["discovery", "other"]);
    expect(tree.groups[1].nodes.map((node) => node.id)).toEqual(["unlisted.thing"]);
  });

  it("a finding with no evidence produces a node with no evidence, and none is invented", () => {
    const empty = finding({ capability: "proof.metadata", evidence: [] as never });
    const tree = capabilityTree(report([empty]));

    expect(tree.groups[0].nodes[0].evidence).toEqual([]);
  });

  it("every audit state maps verbatim, and nothing else appears", () => {
    const states = ["unsupported", "unknown", "detected", "implemented", "tested", "feasible"] as const;
    const tree = capabilityTree(
      report(states.map((state) => finding({ capability: "proof.app-intents-testing", state })))
    );

    const rendered = new Set(tree.groups[0].nodes.map((node) => node.state));
    expect([...rendered]).toHaveLength(states.length);
    for (const node of tree.groups[0].nodes) {
      expect(states).toContain(node.state);
    }
  });

  it("a finding without a dot still lands in the group whose head it names", () => {
    const bare = finding({ capability: "foundation" });
    const tree = capabilityTree(report([bare]));
    expect(tree.groups[0].id).toBe("foundation");
    expect(tree.groups[0].nodes[0].id).toBe("foundation");
  });

  it("no group the catalogue does not know can appear as a named group", () => {
    const tree = capabilityTree(
      report([
        finding({ capability: "unlisted.thing" }),
        finding({ capability: "other.nope" }),
        finding({ capability: "also-unlisted.thing" })
      ])
    );
    const ids = tree.groups.map((group) => group.id);
    expect(ids).toEqual(["other"]);
    expect(ids).not.toContain("unlisted");
    expect(ids).not.toContain("also-unlisted");
  });
});
