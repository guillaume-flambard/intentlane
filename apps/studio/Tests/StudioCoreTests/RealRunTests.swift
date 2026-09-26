import Foundation
import Testing

@testable import StudioCore

/// The proof that the window's core drives the real engine, on a real pilot, in
/// an isolated worktree, at a chosen revision.
///
/// It is opt-in because it runs a repository's own build. Set
/// `INTENTLANE_STUDIO_PROVE=1` and point `INTENTLANE_STUDIO_REPO` at the pilot
/// working copy. Nothing here is mocked: the executor launches the bundled
/// TypeScript engine, and the journal it returns is the engine's own.
@Suite("The window's core drives the real engine", .serialized)
struct RealRunTests {
    private static var isEnabled: Bool {
        ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_PROVE"] == "1"
    }

    @Test("a real run in a worktree leaves the user's checkout untouched", .enabled(if: isEnabled))
    func realRun() throws {
        guard let repositoryPath = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"] else {
            Issue.record("INTENTLANE_STUDIO_REPO is not set")
            return
        }
        let repository = URL(fileURLWithPath: repositoryPath)
        let worktree = repository.appendingPathComponent(".worktrees/studio")
        let engine = URL(fileURLWithPath: ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_ENGINE"] ?? "")

        let before = DiffReader.state(of: repository)
        let head = Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", worktree.path, "rev-parse", "--short=12", "HEAD"]).stdout.trimmed

        let scope = RunScope(
            repository: repository,
            commit: head,
            branch: Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", worktree.path, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trimmed,
            workingDirectory: worktree,
            engine: engine,
            provider: .localEngine,
            sendsCodeToModel: false
        )

        let report = Executor().runPilot(scope, pilot: "fsnotes")
        let after = DiffReader.state(of: repository)

        print("outcome: \(report.outcome)")
        print("headline: \(report.headline)")
        print("steps: \(report.journal?.steps.map { "\($0.id)=\($0.status)" } ?? [])")
        print("diff present: \(report.diff != nil)")
        print("unverified by a human: \(report.unverifiedByAHuman)")

        // The user's own checkout is compared, not assumed.
        #expect(DiffReader.verify(before, after) == .untouched)

        // Whatever happened, the window must not read an incomplete run as done.
        if !(report.journal?.isComplete ?? false) {
            #expect(report.headline != .integrated)
        }
    }
}
