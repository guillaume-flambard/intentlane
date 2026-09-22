import type { AuditFinding, AuditReport } from "./audit.js";
import { recordedConditionCount } from "./audit-conditions.js";
import { scoreAuditReport } from "./audit-score.js";

export const AUDIT_FORMATS = ["text", "json", "sarif"] as const;
export type AuditFormat = (typeof AUDIT_FORMATS)[number];

const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
const TOOL_NAME = "IntentLane";
const TOOL_URI = "https://github.com/guillaume-flambard/intentlane";

function level(confidence: AuditFinding["confidence"]): "error" | "warning" | "note" {
  if (confidence === "high") return "error";
  if (confidence === "medium") return "warning";
  return "note";
}

function targetLine(report: AuditReport): string {
  const target = report.target;
  const version = target.deploymentTarget ? ` ${target.deploymentTarget}` : "";
  return `target ${target.name} (${target.platform}${version})`;
}

export function formatText(report: AuditReport): string {
  const score = scoreAuditReport(report);
  const lines: string[] = [
    targetLine(report),
    `score ${score.score}/100 (${score.band}, ${score.discovery}) ${score.points}/${score.maximum} points`
  ];
  if (report.route) lines.push(`route ${report.route.route} (${report.route.confidence})`);
  if (report.data) lines.push(`data ${report.data.classes.join("+")} (privacy ${report.data.privacy})`);
  if (report.architecture) lines.push(`architecture ${report.architecture.architecture} (${report.architecture.confidence})`);
  if (report.conditions) {
    lines.push(
      `conditions ${recordedConditionCount(report.conditions)}/${report.conditions.conditions.length} recorded`
    );
  }
  for (const finding of report.findings) {
    lines.push(`${finding.platform} ${finding.state} ${finding.capability} (${finding.confidence})`);
    for (const gap of finding.gaps) lines.push(`  ${gap.code} ${gap.message}`);
    if (finding.nextAction) lines.push(`  next: ${finding.nextAction}`);
  }
  return `${lines.join("\n")}\n`;
}

export function formatJson(report: AuditReport): string {
  return `${JSON.stringify({ ...report, score: scoreAuditReport(report) }, null, 2)}\n`;
}

export function formatSarif(report: AuditReport): string {
  const codes = new Set<string>();
  const results = report.findings.flatMap((finding) =>
    finding.gaps.map((gap) => {
      codes.add(gap.code);
      return {
        ruleId: gap.code,
        level: level(finding.confidence),
        message: { text: gap.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: finding.evidence[0]?.path ?? finding.capability }
            }
          }
        ],
        properties: {
          capability: finding.capability,
          platform: finding.platform,
          state: finding.state
        }
      };
    })
  );
  const rules = [...codes].sort().map((id) => ({ id }));
  const sarif = {
    version: "2.1.0",
    $schema: SARIF_SCHEMA,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: TOOL_URI,
            rules
          }
        },
        results,
        properties: {
          score: scoreAuditReport(report),
          ...(report.route ? { route: report.route } : {}),
          ...(report.data ? { data: report.data } : {}),
          ...(report.architecture ? { architecture: report.architecture } : {}),
          ...(report.conditions ? { conditions: report.conditions } : {})
        }
      }
    ]
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

export function formatReport(report: AuditReport, format: AuditFormat): string {
  if (format === "json") return formatJson(report);
  if (format === "sarif") return formatSarif(report);
  return formatText(report);
}
