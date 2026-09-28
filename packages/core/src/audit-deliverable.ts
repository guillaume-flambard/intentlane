import { AUDIT_STATES, type AuditFinding, type AuditPlatform, type AuditReport, type AuditState } from "./audit.js";
import { CAPABILITY_GROUPS, type CapabilityGroup } from "./audit-catalogue.js";

export type { CapabilityGroup };
import type { AuditScore } from "./audit-score.js";

/// The deliverable a client reads, rendered from a report the engine already wrote.
///
/// Three rules hold the document to the report it came from.
///
/// **Every number is copied.** The score, its points, its maximum, its discovery
/// mode and the count of findings per state are read from the report. A renderer
/// that re-derived them would be a second audit, and a second audit is a second
/// opinion about someone else's code.
///
/// **An absence stays an absence.** A capability the report does not name is not
/// mentioned, because the audit did not classify it and the document does not
/// claim to have. A capability the report calls `unknown` is rendered as undecided
/// rather than resolved, because a document that resolves it would be stating a
/// conclusion the engine did not reach.
///
/// **The boundary travels with the document.** The audit is read-only, local, and
/// has not observed anything on a device. A reader who takes only this file must
/// still know that, so the limits are printed rather than left to the reader of
/// the repository to infer.
///
/// The function is pure: reports in, text out, no filesystem, no subprocess, no
/// model. Rendering the same report twice produces the same document.
export type ScoredAuditReport = AuditReport &
  Readonly<{ score: AuditScore }>;

/// Where a capability is filed, derived once for the whole repository.
///
/// The ten groups are the catalogue's, imported rather than repeated, and the
/// `other` bucket is part of the answer rather than a fallback: a finding the
/// catalogue does not name is still a finding, and it is filed where a reader
/// goes looking for what did not fit. `capability-map.ts` derives the same
/// answer from the same list, so the window and the document present one report
/// one way.
export function derivedCapabilityGroup(capability: string): CapabilityGroup | "other" {
  const dot = capability.indexOf(".");
  const head = dot > 0 ? capability.slice(0, dot) : capability;
  return (CAPABILITY_GROUPS as readonly string[]).includes(head) ? (head as CapabilityGroup) : "other";
}

/// The ten groups plus `other`, in the order the document prints them. A group
/// with no finding is not printed: the document describes this project, not the
/// catalogue.
export const DELIVERABLE_GROUPS: readonly (CapabilityGroup | "other")[] = [...CAPABILITY_GROUPS, "other"];

/// The document's language. The report's own words are copied whatever this is, so
/// nothing the engine said is translated here.
const DELIVERABLE_LOCALE = "en";

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}\n`;
}

/// One list line.
///
/// The caller does not end its text with a newline: this adds it, and doubling it
/// would put a blank line between every line, which turns an indented evidence
/// line into its own loose paragraph instead of a detail of the finding above it.
/// The document is read as a list, so the list has to be tight.
///
/// A nested line is written as `bullet("  evidence")`, where the spaces come after
/// the marker. Markdown nests on indentation measured from the marker, so spaces
/// placed before the `-` would simply be counted as part of the text.
function bullet(text: string): string {
  return `- ${text}\n`;
}

function evidenceLocation(evidence: { path: string; line?: number }): string {
  return evidence.line === undefined ? evidence.path : `${evidence.path}:${evidence.line}`;
}

/// One finding, in the shape the document prints it. Shared by every group so a
/// finding in a named group and a finding in `other` cannot drift apart.
function renderFinding(finding: AuditFinding): string {
  let out = bullet(`**${finding.capability}**: ${finding.state}, ${finding.confidence} confidence`);
  for (const evidence of finding.evidence) {
    out += bullet(`  evidence: ${evidenceLocation(evidence)}`);
  }
  for (const gap of finding.gaps) {
    out += bullet(`  gap ${gap.code}: ${gap.message}`);
  }
  if (finding.nextAction.length > 0) out += bullet(`  next: ${finding.nextAction}`);
  return out;
}

function platformHeading(platform: AuditPlatform): string {
  return platform === "macos" ? "macOS" : "iOS";
}

/// One platform's section. Everything in it is derived from that platform's report,
/// so a reader of a macOS section never sees an iOS finding and the reverse.
function renderPlatform(report: ScoredAuditReport): string {
  const target = report.target;
  const score = report.score;
  let out = heading(2, `${target.name}, ${platformHeading(target.platform)}`);
  if (target.deploymentTarget !== undefined) out += bullet(`Deployment floor: ${target.deploymentTarget}`);

  out += heading(3, "What the application supports today");
  out += bullet(
    `Compatibility score ${score.score}/100, band ${score.band}, ${score.discovery} discovery. ` +
      `These are the report's own figures: ${score.points} of ${score.maximum} points across ` +
      `${score.applicable} applicable capabilities.`
  );
  out += bullet("State of each capability the audit classified:");
  for (const state of AUDIT_STATES) {
    out += bullet(`  ${state}: ${score.counts[state as AuditState] ?? 0}`);
  }

  // A `Map` of mutable arrays, because the report's findings are readonly and the
  // renderer groups them without ever modifying one.
  const groups = new Map<string, AuditFinding[]>();
  for (const finding of report.findings) {
    const group = derivedCapabilityGroup(finding.capability);
    const bucket = groups.get(group);
    if (bucket === undefined) groups.set(group, [finding]);
    else bucket.push(finding);
  }

  out += heading(3, "Capability by capability");
  for (const group of DELIVERABLE_GROUPS) {
    const bucket = groups.get(group);
    if (bucket === undefined || bucket.length === 0) continue;
    out += heading(4, group);
    for (const finding of bucket) out += renderFinding(finding);
  }

  out += heading(3, "What the audit recorded about the application");
  if (report.route !== undefined) {
    out += bullet(`Integration route: ${report.route.route} (${report.route.confidence} confidence)`);
  }
  if (report.data !== undefined) {
    out += bullet(
      `Indexed data: ${report.data.classes.join(", ") || "none"}, privacy ${report.data.privacy}, ` +
        `indexed ${report.data.indexed ? "yes" : "no"}`
    );
  }
  if (report.architecture !== undefined) {
    out += bullet(`Architecture: ${report.architecture.architecture} (${report.architecture.confidence} confidence)`);
  }
  if (report.quality !== undefined) {
    out += bullet(
      `Action quality: ${report.quality.signals.length} signal(s), ${report.quality.issues.length} issue(s)`
    );
    for (const issue of report.quality.issues) out += bullet(`  issue: ${issue}`);
  }
  if (report.conditions !== undefined) {
    out += bullet(`Test conditions: ${report.conditions.conditions.length} recorded`);
  }
  if (report.catalogue !== undefined) {
    out += bullet(
      `Capability catalogue ${report.catalogue.version}, state ${report.catalogue.state}, ` +
        `${report.catalogue.capabilities} capabilities`
    );
  }
  if (report.targets !== undefined) {
    out += bullet(`Build targets: ${report.targets.targets.length}, scoped ${report.targets.scoped ? "yes" : "no"}`);
  }
  if (report.overlay !== undefined) {
    out += bullet(
      `Consumer overlay ${report.overlay.version}: ${report.overlay.consumption.length} entr(ies), ` +
        `${report.overlay.unknown.length} unknown`
    );
  }
  if (report.sdk !== undefined) {
    out += bullet(`SDK: ${report.sdk.version} (${report.sdk.canonicalName})`);
  }

  return out;
}

/// The section a person fills in. It is written empty on purpose: a document that
/// filled it would be claiming an observation nobody made, and an automated
/// result rendered inside it would be a human observation that never happened.
function renderHumanSection(): string {
  let out = heading(2, "What a person observed");
  out +=
    "This section is empty because the audit does not observe. It reads a repository;\n" +
    "it does not run the application, speak to Siri, or check Spotlight. Record what\n" +
    "a person saw here, and keep it separate from the automated results above.\n\n";
  out += "<!-- Nothing above this line is machine evidence. -->\n\n";
  out += "Not yet observed.\n";
  return out;
}

/// The limits, printed in the document rather than left to the reader of the
/// repository to infer.
function renderBoundary(): string {
  let out = heading(2, "What this document does not say");
  out += bullet("The audit is read-only. It changed nothing in the audited repository.");
  out += bullet("The audit is local. No source, secret or proprietary data left the machine.");
  out +=
    bullet(
      "A capability the audit could not decide is reported as `unknown`, which means " +
        "undecided. It is not a negative result and not a pass."
    );
  out +=
    bullet(
      "Nothing here was observed on a device. Behaviour on Siri, Spotlight and " +
        "Shortcuts is not established by this report, and a human check is still outstanding."
    );
  out += bullet(
    "Siri and Apple Intelligence discovery are reported only where the report carries " +
      "schema evidence. Shortcuts support is not Siri support."
  );
  return out;
}

/// Renders one document from the reports the engine produced, in the order a
/// client reads it: what the application can do, what the audit recorded, what a
/// person has yet to observe, and what the document does not claim.
export function renderDeliverable(reports: readonly ScoredAuditReport[]): string {
  const documentTitle = reports.length === 1 ? reports[0]!.target.name : "IntentLane audit";
  let out = `# ${documentTitle}, Apple capability audit\n\n`;
  out += `Locale: ${DELIVERABLE_LOCALE}\n\n`;
  out += heading(2, "What this is");
  out +=
    "A read-only audit of an existing application, rendered from the machine report\n" +
    "the audit produced. Every figure below is copied from that report.\n\n";

  for (const report of reports) out += renderPlatform(report);

  out += renderHumanSection();
  out += "\n";
  out += renderBoundary();
  // No trailing blank: the document ends on the last line it says.
  return `${out.replace(/\n+$/, "\n")}`;
}
