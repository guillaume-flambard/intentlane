import type { AuditArchitectureReport } from "./audit-architecture.js";
import type { AuditCatalogueReport } from "./audit-catalogue.js";
import type { AuditConditionsReport } from "./audit-conditions.js";
import type { AuditDataReport } from "./audit-data.js";
import type { AuditQualityReport } from "./audit-quality.js";
import type { AuditRouteReport } from "./audit-route.js";
import type { AuditTargetsReport } from "./audit-targets.js";

export const AUDIT_REPORT_VERSION = "1.0";

export const AUDIT_STATES = [
  "unsupported",
  "unknown",
  "detected",
  "implemented",
  "tested",
  "feasible"
] as const;

export type AuditState = (typeof AUDIT_STATES)[number];

export const AUDIT_PLATFORMS = ["macos", "ios"] as const;

export type AuditPlatform = (typeof AUDIT_PLATFORMS)[number];

export const AUDIT_PLATFORM_SELECTIONS = ["macos", "ios", "both"] as const;

export type AuditPlatformSelection = (typeof AUDIT_PLATFORM_SELECTIONS)[number];

export const AUDIT_CONFIDENCES = ["low", "medium", "high"] as const;

export type AuditConfidence = (typeof AUDIT_CONFIDENCES)[number];

export const AUDIT_EVIDENCE_KINDS = [
  "project",
  "swift",
  "metadata",
  "config",
  "contract",
  "test"
] as const;

export type AuditEvidenceKind = (typeof AUDIT_EVIDENCE_KINDS)[number];

export const AUDIT_DIAGNOSTIC_CODES = [
  "ILA100",
  "ILA110",
  "ILA120",
  "ILA130",
  "ILA140",
  "ILA150",
  "ILA160"
] as const;

export type AuditDiagnosticCode = (typeof AUDIT_DIAGNOSTIC_CODES)[number];

export type AuditEvidence = Readonly<{
  kind: AuditEvidenceKind;
  path: string;
  line?: number;
  platform?: AuditPlatform;
}>;

export type AuditGap = Readonly<{
  code: AuditDiagnosticCode;
  message: string;
}>;

export type AuditFinding = Readonly<{
  capability: string;
  platform: AuditPlatform;
  state: AuditState;
  confidence: AuditConfidence;
  evidence: readonly AuditEvidence[];
  requirements: readonly string[];
  gaps: readonly AuditGap[];
  nextAction: string;
}>;

export type AuditTarget = Readonly<{
  name: string;
  platform: AuditPlatform;
  deploymentTarget?: string;
}>;

export type AuditReportExtras = Readonly<{
  sdk?: Readonly<{ version: string; canonicalName: string }>;
  route?: AuditRouteReport;
  data?: AuditDataReport;
  architecture?: AuditArchitectureReport;
  conditions?: AuditConditionsReport;
  quality?: AuditQualityReport;
  catalogue?: AuditCatalogueReport;
  targets?: AuditTargetsReport;
}>;

export type AuditReport = Readonly<{
  reportVersion: string;
  target: AuditTarget;
  sdk?: Readonly<{ version: string; canonicalName: string }>;
  route?: AuditRouteReport;
  data?: AuditDataReport;
  architecture?: AuditArchitectureReport;
  conditions?: AuditConditionsReport;
  quality?: AuditQualityReport;
  catalogue?: AuditCatalogueReport;
  targets?: AuditTargetsReport;
  findings: readonly AuditFinding[];
}>;

const STATE_RANK: Readonly<Record<AuditState, number>> = {
  unsupported: 0,
  unknown: 1,
  detected: 2,
  implemented: 3,
  tested: 4,
  feasible: 5
};

export function compareFindings(left: AuditFinding, right: AuditFinding): number {
  if (left.capability !== right.capability) return left.capability < right.capability ? -1 : 1;
  if (left.platform !== right.platform) return left.platform < right.platform ? -1 : 1;
  return STATE_RANK[left.state] - STATE_RANK[right.state];
}

export function createAuditReport(
  target: AuditTarget,
  findings: readonly AuditFinding[],
  extras: AuditReportExtras = {}
): AuditReport {
  return {
    reportVersion: AUDIT_REPORT_VERSION,
    target,
    ...(extras.sdk ? { sdk: extras.sdk } : {}),
    ...(extras.route ? { route: extras.route } : {}),
    ...(extras.data ? { data: extras.data } : {}),
    ...(extras.architecture ? { architecture: extras.architecture } : {}),
    ...(extras.conditions ? { conditions: extras.conditions } : {}),
    ...(extras.quality ? { quality: extras.quality } : {}),
    ...(extras.catalogue ? { catalogue: extras.catalogue } : {}),
    ...(extras.targets ? { targets: extras.targets } : {}),
    findings: [...findings].sort(compareFindings)
  };
}

const INFORMATIONAL_GAP_CODES: ReadonlySet<AuditDiagnosticCode> = new Set(["ILA100"]);

export function blockingGaps(report: AuditReport): readonly AuditGap[] {
  return report.findings
    .filter((finding) => finding.confidence === "high")
    .flatMap((finding) => finding.gaps)
    .filter((gap) => !INFORMATIONAL_GAP_CODES.has(gap.code));
}
