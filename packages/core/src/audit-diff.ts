import { AUDIT_REPORT_VERSION, AUDIT_STATES, type AuditFinding, type AuditPlatform, type AuditReport, type AuditState } from "./audit.js";
import { scoreAuditReport, type AuditScore } from "./audit-score.js";

export type AuditInput = AuditReport | Readonly<{ reports: readonly AuditReport[] }>;

export const AUDIT_DELTA_ENTRY_KINDS = ["progression", "regression", "added", "removed"] as const;

export type AuditDeltaEntryKind = (typeof AUDIT_DELTA_ENTRY_KINDS)[number];

export type AuditDeltaEntry = Readonly<{
  platform: AuditPlatform;
  capability: string;
  kind: AuditDeltaEntryKind;
  baselineState?: AuditState;
  candidateState?: AuditState;
  baselineFinding?: AuditFinding;
  candidateFinding?: AuditFinding;
  gaps: readonly { code: string; message: string }[];
}>;

export const AUDIT_CONTEXT_SCOPES = ["target", "sdk", "catalogue", "conditions", "route", "architecture", "data", "quality"] as const;

export type AuditContextScope = (typeof AUDIT_CONTEXT_SCOPES)[number];

export type AuditContextChange = Readonly<{
  scope: AuditContextScope;
  platform: AuditPlatform;
  kind: "context";
  baseline: string;
  candidate: string;
}>;

export type AuditScoreDelta = Readonly<{
  platform: AuditPlatform;
  baseline: AuditScore;
  candidate: AuditScore;
}>;

export type AuditDelta = Readonly<{
  baseline: readonly AuditReport[];
  candidate: readonly AuditReport[];
  entries: readonly AuditDeltaEntry[];
  context: readonly AuditContextChange[];
  scores: readonly AuditScoreDelta[];
  progressions: number;
  regressions: number;
  added: number;
  removed: number;
}>;

export const AUDIT_DIFF_ERROR_CODES = ["ILA170", "ILA171", "ILA172"] as const;

export type AuditDiffErrorCode = (typeof AUDIT_DIFF_ERROR_CODES)[number];

export class AuditDiffError extends Error {
  readonly code: AuditDiffErrorCode;
  readonly delta?: AuditDelta;

  constructor(code: AuditDiffErrorCode, message: string) {
    super(`${code} ${message}`);
    this.name = "AuditDiffError";
    this.code = code;
  }
}

const STATE_RANK: Readonly<Record<AuditState, number>> = Object.fromEntries(
  AUDIT_STATES.map((state, index) => [state, index])
) as Record<AuditState, number>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlatform(value: unknown): value is AuditPlatform {
  return value === "macos" || value === "ios";
}

function isState(value: unknown): value is AuditState {
  return typeof value === "string" && (AUDIT_STATES as readonly string[]).includes(value);
}

function parseReport(value: unknown): AuditReport {
  if (!isRecord(value)) throw new AuditDiffError("ILA170", "The audit document is not a JSON object. Regenerate it with 'intentlane audit --format json'.");
  if (value.reportVersion !== AUDIT_REPORT_VERSION) {
    const seen = typeof value.reportVersion === "string" ? value.reportVersion : "missing";
    throw new AuditDiffError("ILA171", `Unsupported audit report version '${seen}'. Regenerate both reports with the same IntentLane version.`);
  }
  const target = value.target;
  if (!isRecord(target) || typeof target.name !== "string" || !isPlatform(target.platform)) {
    throw new AuditDiffError("ILA170", "The audit document has no usable target. Regenerate it with 'intentlane audit --format json'.");
  }
  if (!Array.isArray(value.findings)) {
    throw new AuditDiffError("ILA170", "The audit document has no findings array. Regenerate it with 'intentlane audit --format json'.");
  }
  for (const item of value.findings) {
    if (!isRecord(item) || typeof item.capability !== "string" || !isPlatform(item.platform) || !isState(item.state)) {
      throw new AuditDiffError("ILA170", "The audit document carries a finding without capability, platform or state. Regenerate it with 'intentlane audit --format json'.");
    }
  }
  return value as unknown as AuditReport;
}

export function parseAuditDocument(value: unknown): AuditReport[] {
  if (isRecord(value) && Array.isArray(value.reports)) {
    if (value.reports.length === 0) throw new AuditDiffError("ILA170", "The audit document carries an empty reports collection. Regenerate it with 'intentlane audit --platform both --format json'.");
    return value.reports.map(parseReport);
  }
  return [parseReport(value)];
}

export function parseAuditText(text: string): AuditReport[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new AuditDiffError("ILA170", "The file is not valid JSON. Regenerate it with 'intentlane audit --format json'.");
  }
  return parseAuditDocument(parsed);
}

function platformsOf(reports: readonly AuditReport[]): AuditPlatform[] {
  return [...new Set(reports.map((report) => report.target.platform))].sort() as AuditPlatform[];
}

function summarizeTarget(report: AuditReport): string {
  const version = report.target.deploymentTarget ? ` ${report.target.deploymentTarget}` : "";
  return `${report.target.name} (${report.target.platform}${version})`;
}

function summarizeSdk(report: AuditReport): string {
  return report.sdk ? `${report.sdk.version} ${report.sdk.canonicalName}` : "absent";
}

function summarizeCatalogue(report: AuditReport): string {
  return report.catalogue ? `${report.catalogue.version} (${report.catalogue.state})` : "absent";
}

function summarizeConditions(report: AuditReport): string {
  if (!report.conditions) return "absent";
  return report.conditions.conditions
    .map((condition) => (condition.state === "recorded" ? `${condition.name}=${condition.value ?? ""}` : `${condition.name}=unknown`))
    .join(",");
}

function summarizeRoute(report: AuditReport): string {
  return report.route ? `${report.route.route} (${report.route.confidence})` : "absent";
}

function summarizeArchitecture(report: AuditReport): string {
  return report.architecture ? `${report.architecture.architecture} (${report.architecture.confidence})` : "absent";
}

function summarizeData(report: AuditReport): string {
  return report.data ? `${report.data.classes.join("+")} (privacy ${report.data.privacy})` : "absent";
}

function summarizeQuality(report: AuditReport): string {
  if (!report.quality) return "absent";
  const signals = report.quality.signals.length > 0 ? report.quality.signals.join("+") : "none";
  return `${signals} (${report.quality.issues.length} issue(s))`;
}

const CONTEXT_SUMMARIES: Readonly<Record<AuditContextScope, (report: AuditReport) => string>> = {
  target: summarizeTarget,
  sdk: summarizeSdk,
  catalogue: summarizeCatalogue,
  conditions: summarizeConditions,
  route: summarizeRoute,
  architecture: summarizeArchitecture,
  data: summarizeData,
  quality: summarizeQuality
};

export function diffAuditReports(baseline: readonly AuditReport[], candidate: readonly AuditReport[]): AuditDelta {
  const baselinePlatforms = platformsOf(baseline);
  const candidatePlatforms = platformsOf(candidate);
  const missing = [
    ...baselinePlatforms.filter((platform) => !candidatePlatforms.includes(platform)).map((platform) => `${platform} only in the baseline`),
    ...candidatePlatforms.filter((platform) => !baselinePlatforms.includes(platform)).map((platform) => `${platform} only in the candidate`)
  ];
  if (missing.length > 0) {
    throw new AuditDiffError("ILA172", `Unmatched platform: ${missing.join(", ")}. Audit both sides with the same --platform selection.`);
  }
  const entries: AuditDeltaEntry[] = [];
  const context: AuditContextChange[] = [];
  const scores: AuditScoreDelta[] = [];
  for (const platform of baselinePlatforms) {
    const left = baseline.find((report) => report.target.platform === platform);
    const right = candidate.find((report) => report.target.platform === platform);
    if (!left || !right) continue;
    scores.push({ platform, baseline: scoreAuditReport(left), candidate: scoreAuditReport(right) });
    for (const scope of AUDIT_CONTEXT_SCOPES) {
      const before = CONTEXT_SUMMARIES[scope](left);
      const after = CONTEXT_SUMMARIES[scope](right);
      if (before !== after) context.push({ scope, platform, kind: "context", baseline: before, candidate: after });
    }
    const leftFindings = new Map(left.findings.map((item) => [item.capability, item]));
    const rightFindings = new Map(right.findings.map((item) => [item.capability, item]));
    const capabilities = [...new Set([...leftFindings.keys(), ...rightFindings.keys()])].sort();
    for (const capability of capabilities) {
      const before = leftFindings.get(capability);
      const after = rightFindings.get(capability);
      if (before && after) {
        const difference = (STATE_RANK[after.state] ?? 0) - (STATE_RANK[before.state] ?? 0);
        if (difference === 0) continue;
        entries.push({
          platform,
          capability,
          kind: difference > 0 ? "progression" : "regression",
          baselineState: before.state,
          candidateState: after.state,
          baselineFinding: before,
          candidateFinding: after,
          gaps: [...after.gaps]
        });
      } else if (after) {
        entries.push({
          platform,
          capability,
          kind: "added",
          candidateState: after.state,
          candidateFinding: after,
          gaps: [...after.gaps]
        });
      } else if (before) {
        entries.push({
          platform,
          capability,
          kind: "removed",
          baselineState: before.state,
          baselineFinding: before,
          gaps: []
        });
      }
    }
  }
  entries.sort((left, right) => {
    if (left.platform !== right.platform) return left.platform < right.platform ? -1 : 1;
    return left.capability < right.capability ? -1 : left.capability > right.capability ? 1 : 0;
  });
  return {
    baseline: [...baseline],
    candidate: [...candidate],
    entries,
    context,
    scores,
    progressions: entries.filter((entry) => entry.kind === "progression").length,
    regressions: entries.filter((entry) => entry.kind === "regression").length,
    added: entries.filter((entry) => entry.kind === "added").length,
    removed: entries.filter((entry) => entry.kind === "removed").length
  };
}

export function diffAuditDocuments(baselineDocument: unknown, candidateDocument: unknown): AuditDelta {
  const baseline = typeof baselineDocument === "string" ? parseAuditText(baselineDocument) : parseAuditDocument(baselineDocument);
  const candidate = typeof candidateDocument === "string" ? parseAuditText(candidateDocument) : parseAuditDocument(candidateDocument);
  return diffAuditReports(baseline, candidate);
}

function entryLine(entry: AuditDeltaEntry): string {
  if (entry.kind === "progression" || entry.kind === "regression") {
    return `${entry.platform} ${entry.kind} ${entry.capability}: ${entry.baselineState} -> ${entry.candidateState}`;
  }
  if (entry.kind === "added") return `${entry.platform} added ${entry.capability} (${entry.candidateState})`;
  return `${entry.platform} removed ${entry.capability} (${entry.baselineState})`;
}

export function formatDeltaText(delta: AuditDelta): string {
  const lines: string[] = [
    `baseline ${delta.baseline.length} report(s), candidate ${delta.candidate.length} report(s)`
  ];
  for (const score of delta.scores) {
    lines.push(
      `score ${score.platform} ${score.baseline.score}/100 (${score.baseline.band}, ${score.baseline.discovery}) -> ${score.candidate.score}/100 (${score.candidate.band}, ${score.candidate.discovery})`
    );
  }
  for (const change of delta.context) {
    lines.push(`context ${change.platform} ${change.scope}: ${change.baseline} -> ${change.candidate}`);
  }
  for (const entry of delta.entries) {
    lines.push(entryLine(entry));
    for (const gap of entry.gaps) lines.push(`  ${gap.code} ${gap.message}`);
  }
  lines.push(
    `summary ${delta.progressions} progression(s), ${delta.regressions} regression(s), ${delta.added} added, ${delta.removed} removed, ${delta.context.length} context change(s)`
  );
  return `${lines.join("\n")}\n`;
}

export function formatDeltaJson(delta: AuditDelta): string {
  return `${JSON.stringify(delta, null, 2)}\n`;
}
