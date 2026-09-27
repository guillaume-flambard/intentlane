import { AUDIT_STATES } from "./audit.js";
import type { AuditFinding, AuditReport, AuditState } from "./audit.js";
import { findCapability, type CapabilityGroup } from "./audit-catalogue.js";

export const AUDIT_SCORE_VERSION = "1.1";

export const AUDIT_SCORE_BANDS = ["none", "early", "partial", "close", "ready"] as const;

export type AuditScoreBand = (typeof AUDIT_SCORE_BANDS)[number];

export const AUDIT_SIRI_DISCOVERY = ["schema-backed", "shortcuts-only", "none"] as const;

export type AuditSiriDiscovery = (typeof AUDIT_SIRI_DISCOVERY)[number];

/**
 * One group's contribution to the score. A single number cannot say why a score
 * moved, and the score does move when the catalogue grows: every record a project
 * has not got is `unknown`, which earns nothing while still counting toward the
 * denominator. So the breakdown is not a nicety, it is the only way to tell a
 * regressed project from a completed catalogue.
 */
export type AuditGroupScore = Readonly<{
  group: CapabilityGroup;
  points: number;
  maximum: number;
  applicable: number;
  score: number;
}>;

export type AuditScore = Readonly<{
  version: string;
  score: number;
  band: AuditScoreBand;
  points: number;
  maximum: number;
  applicable: number;
  /**
   * The catalogue the score was computed against. Without it a score is not
   * interpretable across tool versions, because the denominator is the catalogue
   * and the catalogue grows.
   */
  catalogueVersion: string;
  byGroup: readonly AuditGroupScore[];
  counts: Readonly<Record<AuditState, number>>;
  discovery: AuditSiriDiscovery;
}>;

const STATE_POINTS: Readonly<Record<AuditState, number>> = {
  unsupported: 0,
  unknown: 0,
  detected: 1,
  implemented: 2,
  tested: 3,
  feasible: 1
};

const MAXIMUM_POINTS = 3;

function band(score: number): AuditScoreBand {
  if (score <= 0) return "none";
  if (score <= 33) return "early";
  if (score <= 66) return "partial";
  if (score < 100) return "close";
  return "ready";
}

function discovery(findings: readonly AuditFinding[]): AuditSiriDiscovery {
  const schemaBacked = findings.some(
    (finding) =>
      finding.capability === "proof.siri-surface" &&
      (finding.state === "detected" || finding.state === "implemented" || finding.state === "tested")
  );
  if (schemaBacked) return "schema-backed";
  const shortcuts = findings.some(
    (finding) =>
      (finding.capability === "proof.shortcuts-surface" || finding.capability === "semantics.shortcuts-only-schema") &&
      (finding.state === "implemented" || finding.state === "tested")
  );
  return shortcuts ? "shortcuts-only" : "none";
}

function ratio(points: number, maximum: number): number {
  return maximum === 0 ? 0 : Math.round((points / maximum) * 100);
}

function groupOf(finding: AuditFinding): CapabilityGroup | undefined {
  return findCapability(finding.capability)?.group;
}

/**
 * Groups the score by catalogue group. The group comes from the catalogue record,
 * never from parsing the capability id, so an id that resolves to nothing is left
 * out of the breakdown rather than inventing a group for it.
 */
function scoreByGroup(findings: readonly AuditFinding[]): readonly AuditGroupScore[] {
  const totals = new Map<CapabilityGroup, { points: number; applicable: number }>();
  for (const finding of findings) {
    const group = groupOf(finding);
    if (group === undefined) continue;
    const entry = totals.get(group) ?? { points: 0, applicable: 0 };
    if (finding.state !== "unsupported") {
      entry.applicable += 1;
      entry.points += STATE_POINTS[finding.state];
    }
    totals.set(group, entry);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([group, entry]) => ({
      group,
      points: entry.points,
      maximum: entry.applicable * MAXIMUM_POINTS,
      applicable: entry.applicable,
      score: ratio(entry.points, entry.applicable * MAXIMUM_POINTS)
    }));
}

export function scoreAuditReport(report: AuditReport): AuditScore {
  const counts = Object.fromEntries(AUDIT_STATES.map((state) => [state, 0])) as Record<AuditState, number>;
  let points = 0;
  let applicable = 0;
  for (const finding of report.findings) {
    counts[finding.state] += 1;
    if (finding.state === "unsupported") continue;
    applicable += 1;
    points += STATE_POINTS[finding.state];
  }
  const maximum = applicable * MAXIMUM_POINTS;
  const score = ratio(points, maximum);
  return {
    version: AUDIT_SCORE_VERSION,
    score,
    band: band(score),
    points,
    maximum,
    applicable,
    catalogueVersion: report.catalogue?.version ?? "unknown",
    byGroup: scoreByGroup(report.findings),
    counts,
    discovery: discovery(report.findings)
  };
}
