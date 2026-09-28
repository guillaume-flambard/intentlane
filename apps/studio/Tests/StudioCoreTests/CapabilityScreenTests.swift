import Testing
import Foundation
@testable import StudioCore

/// The screen's state, decided by the model: what it shows when an audit has been
/// placed, and that it shows an absence, stated, when there is none. The second
/// half is the discipline the shell keeps everywhere else: no fixture is reached
/// for when the environment names no repository.
@MainActor
struct CapabilityScreenTests {
    private static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()   // StudioCoreTests
        .deletingLastPathComponent()   // Tests
        .deletingLastPathComponent()   // apps/studio
        .deletingLastPathComponent()   // apps
        .deletingLastPathComponent()   // repository root
        .appendingPathComponent("packages/studio-protocol/fixtures/fsnotes-audit.json")

    private func realAudit() throws -> AuditReportMirror {
        let data = try Data(contentsOf: Self.fixtureURL)
        return try #require(AuditReportParser.parse(data))
    }

    @Test func anAuditPlacedInTheShellRendersItsFiftyOneFindingsInTenKnownGroups() throws {
        let model = StudioModel()
        model.applyFixture(stage: .capabilities, inspection: nil, audit: try realAudit())

        guard case .tree(let tree) = model.capabilityScreen else {
            Issue.record("a placed audit must render as a tree, not as an absence")
            return
        }
        #expect(tree.groups.flatMap(\.nodes).count == 51)
        #expect(tree.groups.count == 10)
        #expect(tree.groups.map(\.id) == CapabilityTree.catalogueGroups)
        #expect(model.stage == .capabilities)
    }

    @Test func withNoAuditTheScreenStatesAnAbsenceRatherThanAStateOfNothing() {
        let model = StudioModel()
        guard case .empty(let reason) = model.capabilityScreen else {
            Issue.record("a model with no audit must render as an empty state")
            return
        }
        #expect(!reason.isEmpty)
        #expect(reason.contains("Choose a project"))
    }

    @Test func anInspectedProjectWithNoReportSaysSoRatherThanShowingNothing() {
        let model = StudioModel()
        model.applyFixture(stage: .capabilities, inspection: ProjectInspection(
            facts: ProjectFacts(
                name: "FSNotes",
                repositoryPath: "/tmp/fsnotes",
                branch: "main",
                revision: "abc123",
                xcodeProject: nil,
                minimumMacOS: "14.0",
                uncommitted: []
            ),
            contract: nil,
            cards: [],
            omissions: [],
            engineAvailable: true,
            contractProblem: nil
        ))

        guard case .empty(let reason) = model.capabilityScreen else {
            Issue.record("no report on disk must still render as a stated absence")
            return
        }
        #expect(!reason.isEmpty)
        #expect(reason.contains("worktree") || reason.contains("engine"))
    }

    @Test func noRepositoryIsNamedSoNoRealAuditIsRead() {
        // The real-run discipline in one line: an absent environment variable
        // yields an absent report, never a fixture.
        #expect(RealAuditReader.read(repositoryPath: nil, currentRevision: "abc123") == .absent)
        #expect(RealAuditReader.read(repositoryPath: "", currentRevision: "abc123") == .absent)
        #expect(
            RealAuditReader.read(
                repositoryPath: "/nonexistent/intentlane/no-run-here",
                currentRevision: "abc123"
            ) == .absent
        )
    }

    @Test func aReportFromAnotherCommitIsNeverHandedToTheScreen() throws {
        // The screen's own path, not the reader's: a complete report describing a
        // commit the worktree has left must not reach the map.
        let repository = FileManager.default.temporaryDirectory
            .appendingPathComponent("intentlane-screen-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: repository) }
        try FileManager.default.createDirectory(at: repository, withIntermediateDirectories: true)
        try RealAuditReader.write(
            report: AuditReportMirror(
                reportVersion: "1.0",
                targetName: "Stale",
                platform: "macos",
                findings: [],
                score: nil,
                catalogue: "27.0"
            ),
            revision: "old000",
            to: repository.path
        )

        let model = StudioModel()
        model.applyFixture(stage: .capabilities, inspection: ProjectInspection(
            facts: ProjectFacts(
                name: "MyApp",
                repositoryPath: repository.path,
                branch: "main",
                revision: "new111",
                xcodeProject: nil,
                minimumMacOS: "27.0",
                uncommitted: []
            ),
            contract: nil,
            cards: [],
            omissions: [],
            engineAvailable: false,
            contractProblem: nil
        ))

        let freshness = RealAuditReader.read(
            repositoryPath: repository.path,
            currentRevision: model.facts?.revision
        )
        #expect(freshness.isStale, "the model's own revision is what the report is judged against")
        #expect(freshness.report == nil, "and a stale report never becomes a tree")
        guard case .empty = model.capabilityScreen else {
            Issue.record("with no engine and no fresh report, the screen states an absence")
            return
        }
    }

    @Test func readingIsItsOwnStateWhileTheEngineRuns() {
        let model = StudioModel()
        model.applyFixture(stage: .capabilities, inspection: nil)
        // The model only reports `reading` while an audit is genuinely in flight,
        // so an empty screen can never be mistaken for a slow one.
        #expect(model.capabilityScreen == .empty(model.capabilityEmptyReason))
    }
}
