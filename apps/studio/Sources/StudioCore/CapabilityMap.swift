import Foundation

/// The capability map, typed to the shape `capabilityTree()` in
/// `packages/studio-protocol/src/capability-map.ts` produces.
///
/// Swift mirrors the TypeScript mapping rather than reimplementing the decision
/// the way a screen would if it grouped on its own: every field is copied
/// verbatim from the finding it came from, and the only thing the map adds is
/// the group attribute. The one rule that keeps the two languages honest is
/// stated in the test suite: the same fixture must produce the same tree from
/// either side. The ten groups are written here because a test asserts their
/// order and their content, and the mismatch between two lists is the kind of
/// difference a screen cannot see but a client can.
public struct CapabilityNode: Sendable, Equatable, Identifiable {
    /// The finding's own capability id, verbatim.
    public let id: String
    /// The finding's own state, verbatim.
    public let state: String
    /// The finding's own confidence, verbatim.
    public let confidence: String
    /// The finding's own evidence, verbatim.
    public let evidence: [AuditEvidenceMirror]
    /// The finding's own requirements, verbatim.
    public let dependencies: [String]
    /// The finding's own gaps, verbatim.
    public let gaps: [AuditGapMirror]
    /// The finding's own next action, verbatim.
    public let nextAction: String
    /// The finding's own platform, verbatim.
    public let platform: String?

    init(finding: AuditFindingMirror) {
        self.id = finding.capability
        self.state = finding.state
        self.confidence = finding.confidence
        self.evidence = finding.evidence
        self.dependencies = finding.requirements
        self.gaps = finding.gaps
        self.nextAction = finding.nextAction
        self.platform = finding.platform
    }

    /// The bullet a person cannot read without the engine's own explanation.
    public var needsAttention: Bool {
        state != "implemented" && state != "tested" && state != "verified"
    }
}

public struct CapabilityBucket: Sendable, Equatable, Identifiable {
    /// The catalogue's first fragment of the group, as `capabilityTree()` produces
    /// it. `other` is reachable when a finding's group is not one of the ten the
    /// catalogue names.
    public let id: String
    public let nodes: [CapabilityNode]
}

public struct CapabilityTree: Sendable, Equatable {
    /// The report's own version, verbatim.
    public let reportVersion: String
    /// The report's own platform, verbatim.
    public let platform: String?
    /// The report's own score, verbatim, as context above the tree.
    public let score: AuditScoreMirror?
    /// The report's own catalogue version, verbatim.
    public let catalogue: String?

    /// Groups in catalogue order, then `other` last when a finding falls outside.
    public let groups: [CapabilityBucket]

    public static let catalogueGroups: [String] = [
        "foundation",
        "semantics",
        "entity",
        "parameters",
        "models",
        "discovery",
        "cross-app",
        "relevance",
        "execution",
        "proof"
    ]

    public static func group(of capability: String) -> String {
        let fragment = capability.split(separator: ".").first.map(String.init) ?? capability
        return Self.catalogueGroups.contains(fragment) ? fragment : "other"
    }
}

/// Pure function over an already-parsed report. Neither reads nor writes a
/// filesystem, spawns no subprocess, and consults no model.
public enum CapabilityMapper {
    /// The six states `AUDIT_STATES` declares in `packages/core/src/audit.ts`,
    /// copied so a totals row shows every state the engine can produce, including
    /// the ones this report has none of. A zero is information; a missing column is
    /// a column the reader cannot ask about.
    public static let states: [String] = [
        "unsupported",
        "unknown",
        "detected",
        "implemented",
        "tested",
        "feasible"
    ]

    public static func map(_ report: AuditReportMirror) -> CapabilityTree {
        var buckets: [String: [CapabilityNode]] = [:]
        var order: [String] = []
        for finding in report.findings {
            let group = CapabilityTree.group(of: finding.capability)
            var bucket = buckets[group] ?? []
            if bucket.isEmpty { order.append(group) }
            bucket.append(CapabilityNode(finding: finding))
            buckets[group] = bucket
        }

        let listed = CapabilityTree.catalogueGroups.filter { buckets[$0] != nil }
        let extras = order.filter { !CapabilityTree.catalogueGroups.contains($0) }
        // Source order first, then the catalogue's own order for known groups, then
        // `other` last so an unexpected group cannot bury what did not fit.
        let ordered: [CapabilityBucket] = (listed + extras.filter { $0 != "other" }).map {
            CapabilityBucket(id: $0, nodes: buckets[$0] ?? [])
        } + (buckets["other"] == nil ? [] : [CapabilityBucket(id: "other", nodes: buckets["other"] ?? [])])

        return CapabilityTree(
            reportVersion: report.reportVersion,
            platform: report.platform,
            score: report.score,
            catalogue: report.catalogueVersion,
            groups: ordered
        )
    }
}
