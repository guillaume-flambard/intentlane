import { AUDIT_STATES } from "./audit.js";
import type { AuditFinding, AuditReport, AuditState } from "./audit.js";

export const AUDIT_SCORE_VERSION = "1.0";

export const AUDIT_SCORE_BANDS = ["none", "early", "partial", "close", "ready"] as const;

export type AuditScoreBand = (typeof AUDIT_SCORE_BANDS)[number];

export const AUDIT_SIRI_DISCOVERY = ["schema-backed", "shortcuts-only", "none"] as const;

export type AuditSiriDiscovery = (typeof AUDIT_SIRI_DISCOVERY)[number];

export type AuditScore = Readonly<{
  version: string;
  score: number;
  band: AuditScoreBand;
  points: number;
  maximum: number;
  applicable: number;
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
      finding.capability.startsWith("semantics.") &&
      (finding.state === "implemented" || finding.state === "tested")
  );
  if (schemaBacked) return "schema-backed";
  const shortcuts = findings.some(
    (finding) => finding.capability === "proof.shortcuts-surface" && finding.state === "implemented"
  );
  return shortcuts ? "shortcuts-only" : "none";
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
  const score = maximum === 0 ? 0 : Math.round((points / maximum) * 100);
  return {
    version: AUDIT_SCORE_VERSION,
    score,
    band: band(score),
    points,
    maximum,
    applicable,
    counts,
    discovery: discovery(report.findings)
  };
}
