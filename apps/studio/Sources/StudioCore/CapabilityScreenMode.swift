import Foundation

/// The state the Capabilities screen renders. Decided by the model and not by the
/// view, so the reason a tree is absent is one string the tests can assert instead
/// of a branch a reader of the window has to infer.
public enum CapabilityScreenMode: Equatable, Sendable {
    /// No tree, and the stated reason there is none.
    case empty(String)
    /// An audit is being read right now.
    case reading
    /// The tree the report produced, verbatim.
    case tree(CapabilityTree)
}

/// Reads a report a previous run already wrote, the way every other real-run input
/// is read: from the repository the environment names, and absent when it names
/// none. A screen that falls back to a fixture when this returns nil would be
/// showing somebody else's project, which is why there is no fallback.
public enum RealAuditReader {
    /// Beside the journal the run wrote, because the run writes both in its own
    /// worktree directory.
    public static func auditURL(repositoryPath: String) -> URL {
        URL(fileURLWithPath: repositoryPath)
            .appendingPathComponent(".worktrees/studio/.intentlane/run/audit.json")
    }

    public static func read(repositoryPath: String?) -> AuditReportMirror? {
        guard let repositoryPath, !repositoryPath.isEmpty else { return nil }
        guard let data = try? Data(contentsOf: auditURL(repositoryPath: repositoryPath)) else { return nil }
        return AuditReportParser.parse(data)
    }
}
