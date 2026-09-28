import type {
  AuditEvidence,
  AuditEvidenceKind,
  AuditFinding,
  AuditGap,
  AuditPlatform,
  AuditReport,
  AuditState
} from "../../core/src/audit.js";
import { derivedCapabilityGroup, type CapabilityGroup as CatalogueCapabilityGroup } from "../../core/src/audit-deliverable.js";
import { CAPABILITY_GROUPS } from "../../core/src/audit-catalogue.js";

/// The ten groups the catalogue publishes, and the `other` bucket a finding the
/// catalogue does not name is filed under.
///
/// They are the catalogue's own, imported from core, because this map and the
/// client deliverable present the same report to the same reader. Two copies of
/// these ten names is two places for a group to be renamed in one of them, and the
/// window would then disagree with the document it is sitting next to.
const CATALOGUE_GROUPS = CAPABILITY_GROUPS;

/// The ten catalogue groups, plus the `other` bucket the derivation can return.
/// The map needs `other` as a first-class group because it renders one, and the
/// document files a finding there too.
export type CapabilityGroup = CatalogueCapabilityGroup | "other";

type NodeState = AuditState;

type NodeConfidence = "low" | "medium" | "high";

export type CapabilityEvidenceRef = Readonly<{
  /** The finding's own evidence kind, verbatim. */
  kind: AuditEvidenceKind;
  /** The finding's own path, verbatim. */
  path: string;
  /** The finding's own line, verbatim. Absent stays absent: the map never invents
   * a line, and `number | undefined` is the honest type for "may not be there". */
  line: number | undefined;
  /** The finding's own platform, verbatim. */
  platform: AuditPlatform | undefined;
}>;

export type CapabilityNode = Readonly<{
  /** The finding's own capability id, verbatim. */
  id: string;
  /**
   * The first dot-separated fragment of the capability id, when it is one of the
   * catalogue's groups. Anything else lands in `other` so it is visible rather
   * than silently dropped.
   */
  group: CapabilityGroup;
  /** The finding's own state, verbatim. The map declares no state the report does not produce. */
  state: NodeState;
  /** The finding's own confidence, verbatim. */
  confidence: NodeConfidence;
  /** The finding's own evidence, verbatim. An empty evidence list stays empty. */
  evidence: readonly CapabilityEvidenceRef[];
  /** The finding's own requirements, verbatim. */
  dependencies: readonly string[];
  /** The finding's own gaps, verbatim. */
  gaps: readonly AuditGap[];
  /** The finding's own next action, verbatim. */
  nextAction: string;
}>;

export type CapabilityGroupBucket = Readonly<{
  id: CapabilityGroup;
  nodes: readonly CapabilityNode[];
}>;

export type CapabilityTree = Readonly<{
  /** The report's own version, verbatim. */
  reportVersion: string;
  /** The report's own target, verbatim. */
  platform: AuditPlatform | undefined;
  /** Groups in catalogue order, then `other` last when a finding falls outside the catalogue. */
  groups: readonly CapabilityGroupBucket[];
}>;

/// One derivation of the groups, for the whole repository.
///
/// An unlisted group is not silently folded into a known one, and it is not
/// dropped either: `other` files the finding where a reader goes to look for what
/// did not fit, and the node inside it is unchanged. The deliverable derives it the
/// same way, from the same function, so the window and the document cannot present
/// the same report differently.
function groupOf(capability: string): CapabilityGroup {
  return derivedCapabilityGroup(capability);
}

function nodeOf(finding: AuditFinding): CapabilityNode {
  return {
    id: finding.capability,
    group: groupOf(finding.capability),
    state: finding.state,
    confidence: finding.confidence,
    evidence: finding.evidence.map((entry: AuditEvidence) => ({
      kind: entry.kind,
      path: entry.path,
      line: entry.line,
      platform: entry.platform
    })),
    dependencies: [...finding.requirements],
    gaps: [...finding.gaps],
    nextAction: finding.nextAction
  };
}

export function capabilityTree(report: AuditReport): CapabilityTree {
  const byGroup = new Map<CapabilityGroup, CapabilityNode[]>();
  const order: CapabilityGroup[] = [];

  for (const finding of report.findings) {
    const group = groupOf(finding.capability);
    const bucket = byGroup.get(group);
    if (bucket) {
      bucket.push(nodeOf(finding));
      continue;
    }
    byGroup.set(group, [nodeOf(finding)]);
    order.push(group);
  }

  // Source order first, then the catalogue's own order for the known ones, then
  // `other` last so an unexpected group cannot bury a finding it does not own.
  const orderedGroups: readonly CapabilityGroup[] = [
    ...CATALOGUE_GROUPS.filter((group) => byGroup.has(group)),
    ...order.filter((group) => !CATALOGUE_GROUPS.includes(group as never))
  ];

  return {
    reportVersion: report.reportVersion,
    platform: report.target?.platform,
    groups: orderedGroups.map((group) => ({ id: group, nodes: byGroup.get(group) ?? [] }))
  };
}
