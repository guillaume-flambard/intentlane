import Foundation

/// What produced an audit report, so a report on disk can be compared with the
/// worktree it claims to describe.
///
/// The report itself carries no revision: `AuditReport` names the target, the
/// platform and the findings, and nothing that says which commit was inspected.
/// So a file left in the run directory cannot be judged on its own, and the
/// alternative, preferring a file because it exists, is how a stale document
/// ends up looking like a current one.
public struct AuditProvenance: Sendable, Equatable, Codable {
    /// The worktree revision the audit inspected.
    public let revision: String
    /// The catalogue the audit resolved against, when it recorded one. A
    /// catalogue change can change a finding without a commit changing.
    public let catalogue: String?
    /// The report's own version, so a report written by another tool version is
    /// not read as this one.
    public let reportVersion: String

    public init(revision: String, catalogue: String?, reportVersion: String) {
        self.revision = revision
        self.catalogue = catalogue
        self.reportVersion = reportVersion
    }
}

/// Whether a report found on disk may be shown, and why not when it may not.
public enum AuditFreshness: Sendable, Equatable {
    /// The report describes the worktree that is there now.
    case fresh(AuditReportMirror)
    /// A report exists and does not describe the current worktree. The reason is
    /// stated, because a screen that says "stale" without saying why is a
    /// screen the reader has to guess at.
    case stale(reason: String)
    /// Nothing to read.
    case absent

    public var report: AuditReportMirror? {
        if case .fresh(let report) = self { return report }
        return nil
    }

    public var isStale: Bool { if case .stale = self { return true }; return false }
}

extension AuditReportMirror {
    /// The report as the engine writes it, so the file a run leaves and the file a
    /// test plants are the same document.
    ///
    /// The mirror is `Codable` for transport, but its synthesized encoding uses the
    /// Swift field names: `targetName`, `catalogueVersion`. The engine writes
    /// `target.name` and `catalogue.version`, and `AuditReportParser` reads those
    /// and no others. Encoding the struct directly would therefore write a file the
    /// parser cannot read, which is a document that looks like a report and carries
    /// no target and no catalogue.
    public func toEngineJSON() throws -> Data {
        var object: [String: Any] = [
            "reportVersion": reportVersion,
            "findings": findings.map { $0.toEngineObject }
        ]
        var target: [String: Any] = ["name": targetName]
        if let platform { target["platform"] = platform }
        object["target"] = target
        if let catalogueVersion { object["catalogue"] = ["version": catalogueVersion] }
        if let score { object["score"] = score.toEngineObject }
        return try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
    }
}

extension AuditFindingMirror {
    fileprivate var toEngineObject: [String: Any] {
        var object: [String: Any] = [
            "capability": capability,
            "state": state,
            "confidence": confidence,
            "requirements": requirements,
            "nextAction": nextAction
        ]
        if let platform { object["platform"] = platform }
        if !evidence.isEmpty { object["evidence"] = evidence.map { $0.toEngineObject } }
        if !gaps.isEmpty { object["gaps"] = gaps.map { $0.toEngineObject } }
        return object
    }
}

extension AuditEvidenceMirror {
    fileprivate var toEngineObject: [String: Any] {
        var object: [String: Any] = ["kind": kind]
        if let path { object["path"] = path }
        if let line { object["line"] = line }
        if let platform { object["platform"] = platform }
        return object
    }
}

extension AuditGapMirror {
    fileprivate var toEngineObject: [String: Any] {
        ["code": code, "message": message]
    }
}

extension AuditScoreMirror {
    fileprivate var toEngineObject: [String: Any] {
        [
            "score": score,
            "band": band,
            "points": points,
            "maximum": maximum,
            "applicable": applicable,
            "discovery": discovery
        ]
    }
}

/// Reads an audit report a previous run left in the worktree, and judges it before
/// handing it over.
///
/// The judgement is the whole point. `INTENTLANE_STUDIO_REPO` is the only input,
/// so an absent environment yields an absent report, never a fixture, and a
/// report whose provenance does not match the worktree is stale rather than
/// current.
public enum RealAuditReader {
    public static let runDirectoryName = ".worktrees/studio/.intentlane/run"
    public static let reportFileName = "audit.json"
    public static let provenanceFileName = "audit.provenance.json"

    public static func runDirectory(repositoryPath: String) -> URL {
        URL(fileURLWithPath: repositoryPath).appendingPathComponent(runDirectoryName)
    }

    public static func reportURL(repositoryPath: String) -> URL {
        runDirectory(repositoryPath: repositoryPath).appendingPathComponent(reportFileName)
    }

    public static func provenanceURL(repositoryPath: String) -> URL {
        runDirectory(repositoryPath: repositoryPath).appendingPathComponent(provenanceFileName)
    }

    /// Reads and judges the report, given the worktree's current revision.
    ///
    /// `currentRevision` is the revision the worktree is on now. A report whose
    /// recorded revision differs is stale, whether the file is one day old or one
    /// minute old: the report is a claim about a commit, and the commit is not
    /// the one there.
    public static func read(repositoryPath: String?, currentRevision: String?) -> AuditFreshness {
        guard let repositoryPath, !repositoryPath.isEmpty else { return .absent }

        let reportURL = reportURL(repositoryPath: repositoryPath)
        guard let data = try? Data(contentsOf: reportURL) else { return .absent }
        guard let report = AuditReportParser.parse(data) else {
            return .stale(reason: "The report at \(reportURL.lastPathComponent) could not be parsed, so no report can be shown.")
        }

        guard let provenance = readProvenance(repositoryPath: repositoryPath) else {
            return .stale(
                reason: "The report records which commit it audited, so the one on disk cannot be judged and is not used."
            )
        }

        guard let currentRevision, !currentRevision.isEmpty else {
            return .stale(reason: "The worktree has no recorded revision, so the report cannot be compared with it.")
        }

        guard provenance.revision == currentRevision else {
            return .stale(
                reason: "The report audited \(provenance.revision) and the worktree is now at \(currentRevision)."
            )
        }

        if let catalogue = report.catalogueVersion, let recorded = provenance.catalogue, catalogue != recorded {
            return .stale(
                reason: "The report was written against catalogue \(recorded) and names \(catalogue), so the two do not agree."
            )
        }

        return .fresh(report)
    }

    public static func readProvenance(repositoryPath: String) -> AuditProvenance? {
        let url = provenanceURL(repositoryPath: repositoryPath)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(AuditProvenance.self, from: data)
    }

    /// Writes the report and the provenance that describes it, together, so a
    /// report is never on disk without the record that says what produced it.
    public static func write(
        report: AuditReportMirror,
        revision: String,
        to repositoryPath: String
    ) throws {
        let directory = runDirectory(repositoryPath: repositoryPath)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

        // The engine's own shape, so the file a run leaves behind is a file the
        // parser can read back rather than a document that only looks like one.
        try report.toEngineJSON().write(to: reportURL(repositoryPath: repositoryPath), options: .atomic)

        let provenance = AuditProvenance(
            revision: revision,
            catalogue: report.catalogueVersion,
            reportVersion: report.reportVersion
        )
        try JSONEncoder().encode(provenance).write(
            to: provenanceURL(repositoryPath: repositoryPath),
            options: .atomic
        )
    }
}
