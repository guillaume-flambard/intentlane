import type { AuditSourceFile } from "./audit-detect.js";
import type { AuditEvidence } from "./audit.js";

export const AUDIT_QUALITY_SIGNALS = [
  "result",
  "view",
  "phrases",
  "applicationName",
  "confirmation"
] as const;

export type AuditQualitySignal = (typeof AUDIT_QUALITY_SIGNALS)[number];

export type AuditQualityReport = Readonly<{
  signals: readonly AuditQualitySignal[];
  issues: readonly string[];
  evidence: readonly AuditEvidence[];
  nextAction: string;
}>;

const SIGNALS: Readonly<Record<AuditQualitySignal, RegExp>> = {
  result: /\.result\(/,
  view: /ShowsSnippetView|IntentLaneSnippetView\(/,
  phrases: /\bAppShortcut\(/,
  applicationName: /\$\{applicationName\}|\\\(\.applicationName\)/,
  confirmation: /requestConfirmation\(/
};

const APPLICATION_NAME_ISSUE =
  "A shortcut phrase does not carry the applicationName placeholder, so the system does not register it.";

export function detectActionQuality(sources: readonly AuditSourceFile[]): AuditQualityReport {
  const signals = new Set<AuditQualitySignal>();
  const evidence: AuditEvidence[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const lines = source.contents.split("\n");
    for (const [index, line] of lines.entries()) {
      for (const signal of AUDIT_QUALITY_SIGNALS) {
        if (!SIGNALS[signal].test(line)) continue;
        signals.add(signal);
        const key = `${source.path}\0${signal}`;
        if (seen.has(key)) continue;
        seen.add(key);
        evidence.push({ kind: "swift", path: source.path, line: index + 1 });
      }
    }
  }
  const ordered = AUDIT_QUALITY_SIGNALS.filter((signal) => signals.has(signal));
  const issues: string[] = [];
  if (signals.has("phrases") && !signals.has("applicationName")) issues.push(APPLICATION_NAME_ISSUE);
  const nextAction =
    ordered.length === 0
      ? "No App Intent result, view, phrase or confirmation was found, so the action quality is unknown."
      : issues.length > 0
        ? "Fix the phrase template before claiming the shortcut works."
        : "Keep the action signals with the evidence ledger.";
  return { signals: ordered, issues, evidence, nextAction };
}
