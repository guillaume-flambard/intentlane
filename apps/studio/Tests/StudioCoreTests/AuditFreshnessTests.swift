import Testing
import Foundation
@testable import StudioCore

/// Whether a report found on disk may be shown.
///
/// The failure this suite exists for is a report that is complete, plausible and
/// wrong: it was written for a commit the worktree has since left. Presence was
/// enough to show it, because the reader could not tell a stale document from a
/// current one. Freshness is now asked first, and these tests pin every way the
/// answer can be no.
struct AuditFreshnessTests {
    /// Written in the shape the engine produces, because that is the only shape
    /// the parser reads: the report version as a string, the target under
    /// `target`, the catalogue under `catalogue`. A test that encoded the Swift
    /// mirror's own field names would pass its round trip and prove nothing
    /// about the engine's report.
    private static let reportJSON = """
    {
      "reportVersion": "1.0",
      "target": { "name": "MyApp", "platform": "macos" },
      "catalogue": { "version": "27.0" },
      "findings": []
    }
    """

    private static var report: AuditReportMirror {
        // A parse that fails here means the fixture stopped being a report, and
        // every test below would then be asserting against an empty one. A
        // default keeps the type non-optional; the tests read the fields and
        // would fail loudly, and this fixture is a literal in the same file.
        AuditReportParser.parse(Data(reportJSON.utf8)) ?? AuditReportMirror(
            reportVersion: "0", targetName: "", platform: nil, findings: [], score: nil, catalogue: nil
        )
    }

    /// A throwaway repository with an optional report and provenance, so each
    /// test describes the state it means to describe and nothing else.
    private func withRunDirectory(
        report: AuditReportMirror? = AuditFreshnessTests.report,
        provenance: AuditProvenance? = nil,
        _ body: (String) throws -> Void
    ) throws {
        let repository = FileManager.default.temporaryDirectory
            .appendingPathComponent("intentlane-freshness-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: repository) }
        try FileManager.default.createDirectory(at: repository, withIntermediateDirectories: true)

        if let provenance {
            let path = RealAuditReader.provenanceURL(repositoryPath: repository.path)
            try FileManager.default.createDirectory(
                at: path.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try JSONEncoder().encode(provenance).write(to: path)
        }
        if let report {
            let path = RealAuditReader.reportURL(repositoryPath: repository.path)
            try FileManager.default.createDirectory(
                at: path.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            // The engine's own shape, not `JSONEncoder`'s idea of the mirror's
            // field names. Encoding the Swift struct here would produce a file the
            // parser cannot read, and every freshness test would be asserting
            // against a document no run ever produces.
            try report.toEngineJSON().write(to: path)
        }
        try body(repository.path)
    }

    @Test("a report whose provenance matches the worktree is fresh")
    func aMatchingReportIsFresh() throws {
        try withRunDirectory(provenance: AuditProvenance(
            revision: "abc123", catalogue: "27.0", reportVersion: "1.0"
        )) { repository in
            let freshness = RealAuditReader.read(repositoryPath: repository, currentRevision: "abc123")
            guard case .fresh(let report) = freshness else {
                Issue.record("a report audited at the current revision is fresh, got \(freshness)")
                return
            }
            #expect(report.targetName == "MyApp")
        }
    }

    @Test("a report audited at another commit is stale, not shown")
    func aReportFromAnotherCommitIsStale() throws {
        try withRunDirectory(provenance: AuditProvenance(
            revision: "old000", catalogue: "27.0", reportVersion: "1.0"
        )) { repository in
            let freshness = RealAuditReader.read(repositoryPath: repository, currentRevision: "new111")
            #expect(freshness.isStale, "a complete report from another commit must not be shown")
            #expect(freshness.report == nil, "a stale report is not handed over at all")
        }
    }

    @Test("the reason a report was refused names both revisions")
    func theStaleReasonNamesTheRevisions() throws {
        try withRunDirectory(provenance: AuditProvenance(
            revision: "old000", catalogue: "27.0", reportVersion: "1.0"
        )) { repository in
            guard case .stale(let reason) = RealAuditReader.read(
                repositoryPath: repository, currentRevision: "new111"
            ) else {
                Issue.record("expected a stale reason")
                return
            }
            #expect(reason.contains("old000"), "the reason names the commit that was audited: \(reason)")
            #expect(reason.contains("new111"), "the reason names the commit that is checked out: \(reason)")
        }
    }

    @Test("a report with no provenance cannot be judged, so it is not used")
    func aReportWithoutProvenanceIsNotUsed() throws {
        try withRunDirectory(provenance: nil) { repository in
            let freshness = RealAuditReader.read(repositoryPath: repository, currentRevision: "abc123")
            #expect(freshness.isStale, "a report that cannot be compared with the worktree is not shown")
            #expect(freshness.report == nil)
        }
    }

    @Test("a report whose catalogue disagrees with its own provenance is stale")
    func aCatalogueDisagreementIsStale() throws {
        try withRunDirectory(
            report: AuditReportMirror(
                reportVersion: "1.0",
                targetName: "MyApp",
                platform: "macos",
                findings: [],
                score: nil,
                catalogue: "27.1"
            ),
            provenance: AuditProvenance(revision: "abc123", catalogue: "27.0", reportVersion: "1.0")
        ) { repository in
            #expect(
                RealAuditReader.read(repositoryPath: repository, currentRevision: "abc123").isStale,
                "the report names a catalogue its provenance did not record"
            )
        }
    }

    @Test("a worktree with no revision cannot be compared with anything")
    func anUnrecordedWorktreeRefusesTheReport() throws {
        try withRunDirectory(provenance: AuditProvenance(
            revision: "abc123", catalogue: "27.0", reportVersion: "1.0"
        )) { repository in
            #expect(
                RealAuditReader.read(repositoryPath: repository, currentRevision: nil).isStale,
                "without a revision there is nothing to compare, so the report is not used"
            )
            #expect(RealAuditReader.read(repositoryPath: repository, currentRevision: "").isStale)
        }
    }

    @Test("no repository named means no report, and no fixture in its place")
    func anAbsentEnvironmentYieldsNothing() {
        #expect(RealAuditReader.read(repositoryPath: nil, currentRevision: "abc123") == .absent)
        #expect(RealAuditReader.read(repositoryPath: "", currentRevision: "abc123") == .absent)
    }

    @Test("a report that cannot be parsed is refused rather than half-shown")
    func anUnparseableReportIsRefused() throws {
        let repository = FileManager.default.temporaryDirectory
            .appendingPathComponent("intentlane-broken-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: repository) }
        let path = RealAuditReader.reportURL(repositoryPath: repository.path)
        try FileManager.default.createDirectory(
            at: path.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try Data("not json at all".utf8).write(to: path)

        let freshness = RealAuditReader.read(repositoryPath: repository.path, currentRevision: "abc123")
        #expect(freshness.isStale)
        #expect(freshness.report == nil)
    }

    @Test("a report written by the model comes back fresh")
    func aWrittenReportReadsBackFresh() throws {
        let repository = FileManager.default.temporaryDirectory
            .appendingPathComponent("intentlane-roundtrip-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: repository) }
        try FileManager.default.createDirectory(at: repository, withIntermediateDirectories: true)

        try RealAuditReader.write(report: Self.report, revision: "abc123", to: repository.path)

        guard case .fresh(let read) = RealAuditReader.read(
            repositoryPath: repository.path, currentRevision: "abc123"
        ) else {
            Issue.record("a report the model wrote must read back fresh")
            return
        }
        #expect(read.targetName == "MyApp")
        #expect(read.catalogueVersion == "27.0")
    }
}
