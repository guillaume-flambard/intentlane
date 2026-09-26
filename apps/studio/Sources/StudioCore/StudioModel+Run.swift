import Foundation
import StudioCore

extension StudioModel {
    /// Runs the transformation, in the isolated worktree, and reports what came out.
    /// The worktree is created here and not on the plan screen, because creating a
    /// checkout is a change and the plan screen promises not to make one.
    public func execute() {
        guard let repository, let scope = scope(), !isRunning else { return }
        isRunning = true
        cancellation.clear()
        progressLines = []
        userRepositoryBefore = DiffReader.state(of: repository)
        stage = .run

        let worktree = scope.workingDirectory
        if !FileManager.default.fileExists(atPath: worktree.path) {
            do {
                _ = try Worktree.create(repository: repository, name: "studio", commit: scope.commit)
            } catch {
                finish(RunReport(
                    outcome: .worktreeUnavailable(detail: String(describing: error)),
                    progress: [],
                    toolObservations: [],
                    journal: nil,
                    diff: nil,
                    unverifiedByAHuman: []
                ))
                return
            }
        }

        buildPreflight()
        guard preflight?.isRunnable == true else {
            finish(RunReport(
                outcome: .providerUnavailable(detail: "The preflight found a blocking finding, so nothing ran."),
                progress: [],
                toolObservations: [],
                journal: nil,
                diff: nil,
                unverifiedByAHuman: []
            ))
            return
        }

        let cancellation = self.cancellation
        let pilot = inspection?.contract == nil ? "fsnotes" : "fsnotes"
        let repositoryURL = repository

        Task.detached(priority: .userInitiated) { [weak self] in
            let executor = Executor(
                onLine: { line in Task { @MainActor in self?.note(line) } },
                cancelled: { cancellation.isRequested }
            )
            let report = executor.runPilot(scope, pilot: pilot)
            let after = DiffReader.state(of: repositoryURL)
            await MainActor.run {
                guard let self else { return }
                if let before = self.userRepositoryBefore {
                    // Measured, not promised: the user's own checkout is compared
                    // before and after rather than assumed untouched.
                    self.userRepositoryVerdict = DiffReader.verify(before, after)
                }
                self.finish(report)
            }
        }
    }

    /// The technical log. It is not the product surface, so it stays collapsed and
    /// out of the way of the route.
    public var lastProgressLines: [String] {
        progressLines.suffix(200).map(\.line)
    }
}
