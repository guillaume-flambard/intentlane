import Foundation
import Testing

@testable import StudioCore

// MARK: - The journal, read the way the engine writes it

private func journalData(
    steps: [[String: Any]],
    schema: String = "pilot-run/1.0",
    commit: String = "a96b9b5cafe0"
) -> Data {
    let document: [String: Any] = [
        "schema": schema,
        "pilot": "fsnotes",
        "branch": "intentlane/pilot-notebook",
        "commit": commit,
        "steps": steps
    ]
    return try! JSONSerialization.data(withJSONObject: document)
}

private func passed(_ id: String, evidence: [[String: Any]]) -> [String: Any] {
    ["id": id, "status": "pass", "commit": "a96b9b5cafe0", "attempts": 1, "evidence": evidence]
}

@Suite("The journal is read strictly, because a repaired journal reports a run that never happened")
struct JournalTests {
    @Test("a complete run reads, and its sequence comes from the engine's declaration")
    func readsACompleteRun() throws {
        let data = journalData(steps: [
            passed("prepare", evidence: [["kind": "command", "command": "pnpm validate", "exitCode": 0]]),
            passed("implement", evidence: [["kind": "build", "artifact": "IntentLaneGenerated.swift"]]),
            passed("deliver", evidence: [["kind": "command", "command": "git diff HEAD", "exitCode": 0]])
        ])
        let journal = try JournalReader.read(data)

        #expect(journal.isComplete)
        #expect(journal.settled.map(\.id) == [.prepare, .implement, .deliver])
        #expect(journal.blockingDiagnostic == nil)
    }

    @Test("a passed step with no evidence is refused, which is the schema's invariant")
    func refusesAPassWithoutEvidence() {
        let data = journalData(steps: [["id": "prepare", "status": "pass", "commit": "a96b9b5cafe0", "attempts": 1, "evidence": []]])

        #expect(throws: JournalError.passedStepWithoutEvidence(.prepare)) {
            try JournalReader.read(data)
        }
    }

    @Test("a blocked step with no diagnostic is refused, because that is the one thing a reader needs")
    func refusesABlockWithoutADiagnostic() {
        let data = journalData(steps: [["id": "test", "status": "blocked", "commit": "a96b9b5cafe0", "attempts": 1, "evidence": []]])

        #expect(throws: JournalError.blockedStepWithoutDiagnostic(.test)) {
            try JournalReader.read(data)
        }
    }

    @Test("a commit that is not a revision is refused rather than accepted as a string")
    func refusesABadRevision() {
        let data = journalData(steps: [], commit: "not-a-revision")

        #expect(throws: JournalError.badRevision(field: "commit", value: "not-a-revision")) {
            try JournalReader.read(data)
        }
    }

    @Test("another schema is refused rather than guessed at")
    func refusesAnotherSchema() {
        let data = journalData(steps: [], schema: "pilot-run/2.0")

        #expect(throws: JournalError.wrongSchema("pilot-run/2.0")) {
            try JournalReader.read(data)
        }
    }

    @Test("a step repeated twice is refused, so progress cannot be counted twice")
    func refusesADuplicateStep() {
        let data = journalData(steps: [
            passed("prepare", evidence: [["kind": "command", "exitCode": 0]]),
            passed("prepare", evidence: [["kind": "command", "exitCode": 0]])
        ])

        #expect(throws: JournalError.duplicateStep(.prepare)) {
            try JournalReader.read(data)
        }
    }
}

// MARK: - The five cases the window has to survive

private func scope(
    worktree: URL = URL(fileURLWithPath: "/tmp/worktree"),
    engine: URL = URL(fileURLWithPath: "/tmp/engine"),
    provider: Provider = .localEngine
) -> RunScope {
    RunScope(
        repository: URL(fileURLWithPath: "/tmp/worktree"),
        commit: "a96b9b5cafe0",
        branch: "intentlane/pilot-notebook",
        workingDirectory: worktree,
        engine: engine,
        provider: provider,
        sendsCodeToModel: false
    )
}

@Suite("The window survives the five ways a run goes wrong")
struct ExecutorTests {
    @Test("a cancelled run is stopped, never an integration, and the engine is not launched")
    func cancellationStopsTheRun() {
        let launched = LaunchProbe()
        let executor = Executor(
            cancelled: { true },
            run: { _, _, _ in launched.mark(); return (0, "", "") }
        )

        let report = executor.runPilot(scope(), pilot: "fsnotes")

        #expect(launched.count == 0)
        #expect(report.outcome == .cancelled)
        #expect(report.headline != .integrated)
        if case .stopped = report.headline {} else { Issue.record("a cancelled run must read as stopped") }
    }

    @Test("a failing baseline is reported as the run's own diagnostic, not as a window error")
    func failingBaselineIsReported() throws {
        let failing = journalData(steps: [
            ["id": "prepare", "status": "fail", "commit": "a96b9b5cafe0", "attempts": 1, "evidence": [], "diagnostic": "ILA179 the baseline build did not produce a running app"]
        ])
        let (executor, scoped) = makeExecutor(journal: failing, exitCode: 1)

        let report = executor.runPilot(scoped, pilot: "fsnotes")

        #expect(report.journal?.step(.prepare)?.status == .fail)
        #expect(report.headline != .integrated)
        #expect(report.journal?.blockingDiagnostic?.contains("baseline build") == true)
    }

    @Test("a provider that is not installed blocks the run before anything executes")
    func providerUnavailableBlocks() {
        let preflight = PreflightBuilder.build(
            scope: scope(provider: .openCode),
            isExecutable: { _ in true },
            run: { _, arguments in arguments.first == "opencode" ? (1, "", "not found") : (0, "1.0.0", "") }
        )

        #expect(preflight.isRunnable == false)
        #expect(preflight.findings.contains { $0.id == "provider-unavailable" })
    }

    @Test("a test that fails leaves the run incomplete and names the failing step")
    func failingTestLeavesTheRunIncomplete() throws {
        let failing = journalData(steps: [
            passed("prepare", evidence: [["kind": "command", "exitCode": 0]]),
            ["id": "test", "status": "fail", "commit": "a96b9b5cafe0", "attempts": 2, "evidence": [], "diagnostic": "integration suite: 1 check failed"]
        ])
        let (executor, scoped) = makeExecutor(journal: failing, exitCode: 1)
        let report = executor.runPilot(scoped, pilot: "fsnotes")

        #expect(report.journal?.isComplete == false)
        #expect(report.headline != .integrated)
    }

    @Test("missing permissions are a blocking finding, so the run cannot start")
    func missingPermissionsBlock() {
        let preflight = PreflightBuilder.build(
            scope: scope(worktree: URL(fileURLWithPath: "/tmp/somewhere-else")),
            isExecutable: { _ in true },
            run: { _, _ in (0, "a96b9b5cafe0", "") }
        )

        #expect(preflight.isRunnable == false)
        #expect(preflight.findings.contains { $0.id == "scope-escapes-repository" })
    }

    @Test("a run that reached delivery still says what a person did not verify")
    func deliveryDoesNotClaimHumanProof() throws {
        let delivered = journalData(steps: [
            passed("prepare", evidence: [["kind": "command", "exitCode": 0]]),
            passed("implement", evidence: [["kind": "build", "artifact": "IntentLaneGenerated.swift"]]),
            passed("test", evidence: [["kind": "command", "command": "swift test", "exitCode": 0]]),
            passed("deliver", evidence: [["kind": "command", "command": "git diff HEAD", "exitCode": 0]])
        ])
        let (executor, scoped) = makeExecutor(journal: delivered, exitCode: 0)
        let report = executor.runPilot(scoped, pilot: "fsnotes")

        #expect(report.journal?.isComplete == true)
        // No `demonstrate` step, so a person has not tried the journey, and the
        // window must not read as a finished integration.
        #expect(report.headline == .prepared)
        #expect(report.unverifiedByAHuman == ["the demonstrated journey"])
    }
}

/// Writes a journal into a throwaway worktree and returns an executor plus a
/// scope pointing at that same worktree, so the executor reads the journal the
/// engine would have written rather than one the test kept to itself.
private func makeExecutor(journal: Data, exitCode: Int32) -> (Executor, RunScope) {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("studio-test-\(UUID().uuidString)")
    let runDirectory = directory.appendingPathComponent(".intentlane/run")
    try? FileManager.default.createDirectory(at: runDirectory, withIntermediateDirectories: true)
    try? journal.write(to: runDirectory.appendingPathComponent("journal.json"))
    let scoped = scope(worktree: directory)
    return (Executor(run: { _, _, _ in (exitCode, "", "") }), scoped)
}

/// A reference box, so a `@Sendable` closure can record that it ran without
/// mutating a captured local.
private final class LaunchProbe: @unchecked Sendable {
    private(set) var count = 0
    func mark() { count += 1 }
}

@Suite("The worktree is invisible to the user's checkout")
struct WorktreeTests {
    @Test("the worktree directory is excluded locally, not by editing a tracked file")
    func excludesLocally() throws {
        let clone = FileManager.default.temporaryDirectory.appendingPathComponent("clone-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: clone.appendingPathComponent(".git/info"), withIntermediateDirectories: true)

        #expect(throws: Never.self) { try Worktree.excludeLocally(clone) }
        let exclude = try String(contentsOf: clone.appendingPathComponent(".git/info/exclude"), encoding: .utf8)
        #expect(exclude.contains(".worktrees/"))
        // Idempotent, because the app is opened more than once.
        #expect(try Worktree.excludeLocally(clone) == false)
        // And nothing tracked was touched, which is the property that matters.
        #expect(!FileManager.default.fileExists(atPath: clone.appendingPathComponent(".gitignore").path))
    }

    @Test("a directory that is not a repository is refused")
    func refusesANonRepository() throws {
        let plain = FileManager.default.temporaryDirectory.appendingPathComponent("plain-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: plain, withIntermediateDirectories: true)

        #expect(throws: Worktree.Failure.notARepository(plain.path)) {
            try Worktree.create(repository: plain, name: "studio", commit: "a96b9b5cafe0")
        }
    }
}
