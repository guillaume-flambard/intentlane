import Foundation

/// The filter row on the capability map. Each case names states the report itself
/// produced, so a filter can never select a state the engine did not declare, and
/// `problems` is the node's own `needsAttention` word rather than a judgement the
/// window invented after the fact.
public enum CapabilityFilter: String, CaseIterable, Sendable, Equatable {
    case all = "All"
    case problems = "Problems"
    case implemented = "Implemented"
    case tested = "Tested"
    case unknown = "Unknown"

    public func matches(_ node: CapabilityNode) -> Bool {
        switch self {
        case .all: return true
        case .problems: return node.needsAttention
        case .implemented: return node.state == "implemented"
        case .tested: return node.state == "tested"
        case .unknown: return node.state == "unknown"
        }
    }

    /// Keeps the group order the mapping produced, drops only the groups this
    /// filter empties, and returns an empty group list when nothing matches, which
    /// the screen renders as a stated absence rather than as an unchanged map.
    public func apply(to tree: CapabilityTree) -> CapabilityTree {
        let groups = tree.groups.compactMap { bucket -> CapabilityBucket? in
            let nodes = bucket.nodes.filter(matches)
            guard !nodes.isEmpty else { return nil }
            return CapabilityBucket(id: bucket.id, nodes: nodes)
        }
        return CapabilityTree(
            reportVersion: tree.reportVersion,
            platform: tree.platform,
            score: tree.score,
            catalogue: tree.catalogue,
            groups: groups
        )
    }
}
