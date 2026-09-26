import SwiftUI
import StudioCore

/// The three states the window has, and only three: what to do, doing it, and
/// what came out. There is no fourth screen that opens on a forty-capability
/// report, because the first question is never "what does the catalogue know"
/// but "what do you want done to your project".
enum StudioState: Equatable {
    case choose
    case running
    case result
}

@Observable
@MainActor
final class StudioModel {
    var state: StudioState = .choose

    // The project and the result wanted.
    var repository: URL?
    var branch: String = ""
    var revision: String = ""
    var integration: DiffReader.SupportedIntegration?

    // Execution, with progress that came from the engine.
    var report: RunReport?
    var preflight: Preflight?
    var progressLines: [RunProgress] = []
    var isRunning = false
    /// A box, because the executor reads it from a detached task and a plain
    /// `@MainActor` property cannot be touched from there.
    let cancellation = Cancellation()

    // The result and its proofs, kept in four separate piles on purpose.
    var observations: [String] = []
    var userRepositoryBefore: DiffReader.RepositoryState?
    var userRepositoryVerdict: DiffReader.Unchanged?

    var canRun: Bool {
        repository != nil && !revision.isEmpty && integration != nil && !isRunning
    }

    func requestCancel() { cancellation.request() }

    /// Reads the chosen repository and fills in what can be read without
    /// executing anything from it.
    func inspect() {
        guard let repository else { return }
        branch = Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trimmed
        revision = Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path, "rev-parse", "--short=12", "HEAD"]).stdout.trimmed
        userRepositoryBefore = DiffReader.state(of: repository)
        if let pilots = Bundle.main.resourceURL?.appendingPathComponent("pilots", isDirectory: true) {
            integration = DiffReader.supportedIntegrations(manifestDirectory: pilots.appendingPathComponent("fsnotes")).first
        }
    }

    /// Builds the preflight and shows it. Nothing runs until the user has seen it.
    func prepare() {
        guard let repository, let integration else { return }
        let worktree = repository.appendingPathComponent(".worktrees/studio")
        let scope = RunScope(
            repository: repository,
            commit: revision,
            branch: branch,
            workingDirectory: worktree,
            engine: Bundle.main.resourceURL?.appendingPathComponent("engine/run") ?? URL(fileURLWithPath: "/missing"),
            provider: .localEngine,
            sendsCodeToModel: false
        )
        preflight = PreflightBuilder.build(scope: scope)
        state = .running
    }

    func execute() {
        guard let preflight, preflight.isRunnable, let repository, let integration else { return }
        isRunning = true
        cancellation.clear()
        progressLines = []
        let worktree = preflight.scope.workingDirectory
        let pilot = integration.id

        let cancellation = self.cancellation
        let worktreeURL = repository
        Task.detached(priority: .userInitiated) { [weak self] in
            let executor = Executor(
                onLine: { line in Task { @MainActor in self?.progressLines.append(line) } },
                cancelled: { cancellation.isRequested }
            )
            let report = executor.runPilot(preflight.scope, pilot: pilot)
            let after = DiffReader.state(of: worktreeURL)
            await MainActor.run {
                guard let self else { return }
                self.report = report
                self.observations = report.toolObservations
                self.isRunning = false
                self.state = .result
                if let before = self.userRepositoryBefore {
                    // Measured, not promised: the user's own checkout is compared
                    // before and after rather than assumed untouched.
                    self.userRepositoryVerdict = DiffReader.verify(before, after)
                }
            }
        }
    }
}

/// The cancel flag, shared between the window and the detached run.
final class Cancellation: @unchecked Sendable {
    private let lock = NSLock()
    private var flag = false

    func request() {
        lock.lock(); flag = true; lock.unlock()
    }

    func clear() {
        lock.lock(); flag = false; lock.unlock()
    }

    var isRequested: Bool {
        lock.lock(); defer { lock.unlock() }
        return flag
    }
}
