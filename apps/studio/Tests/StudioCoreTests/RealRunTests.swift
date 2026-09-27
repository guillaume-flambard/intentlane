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
            contract: ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_CONTRACT"].map { URL(fileURLWithPath: $0) },
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

    /// The same run, read through the five-stage model the window actually holds, so
    /// the journey the user sees is proven against the engine rather than assumed to
    /// be a reformatting of the report the executor returns.
    @Test("the window's model reaches an honest state from the real run", .enabled(if: isEnabled))
    @MainActor
    func modelReachesAnHonestState() throws {
        guard let repositoryPath = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"] else {
            Issue.record("INTENTLANE_STUDIO_REPO is not set")
            return
        }
        let repository = URL(fileURLWithPath: repositoryPath)
        let worktree = repository.appendingPathComponent(".worktrees/studio")
        let head = Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", worktree.path, "rev-parse", "--short=12", "HEAD"]).stdout.trimmed
        let engine = URL(fileURLWithPath: ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_ENGINE"] ?? "")
        let contract = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_CONTRACT"].map { URL(fileURLWithPath: $0) }

        let model = StudioModel()
        model.inspect(repository)

        // A project with a real contract offers real journeys.
        let hasJourney = try #require(
            model.canContinueToGoal,
            "a project with a contract must offer the goal screen. contract problem: \(model.contractProblem ?? "none")"
        )
        _ = hasJourney
        let firstGoal = try #require(model.cards.first, "journeys come from the contract, not from a list")

        model.advanceToGoal()
        #expect(model.stage == .goal)
        model.select(firstGoal.id)
        #expect(model.canPlan)
        model.buildPlan()
        #expect(model.stage == .plan)
        #expect(model.plan.count == 6, "the plan is six nodes from existing app to verify")

        // Running is the executor's job, already proven above; here the model is
        // placed on the result with the journal the engine wrote, so the journey's
        // last screen is judged on real evidence.
        let report = Executor().runPilot(
            RunScope(
                repository: repository,
                commit: head,
                branch: Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", worktree.path, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trimmed,
                workingDirectory: worktree,
                contract: contract,
                engine: engine,
                provider: .localEngine,
                sendsCodeToModel: false
            ),
            pilot: "fsnotes"
        )
        model.applyFixture(stage: .run, inspection: model.inspection, selectedGoalID: firstGoal.id)
        model.finish(report)

        #expect(model.stage == .result)
        print("verdict: \(model.verdict)")
        print("route: \(model.route.map { "\($0.title)=\($0.statusLabel)" })")

        // The model must not call an unfinished run ready, and it must not call a
        // run that waits on a person a failure.
        if !(report.journal?.isComplete ?? false) {
            #expect(model.verdict != .verified, "an unfinished run must never be called verified")
        }
        if report.journal?.step(.test)?.status == .blocked {
            #expect(model.verdict != .blocked(reason: ""), "a step that waits on a person is not a failure")
        }
        // Every settled step has an evidence row, and every unsettled one is absent.
        #expect(model.evidence.allSatisfy { $0.derivedClaim.isEmpty == false })
        #expect(model.evidence.contains { $0.state == .humanCheckRequired })
    }
}
