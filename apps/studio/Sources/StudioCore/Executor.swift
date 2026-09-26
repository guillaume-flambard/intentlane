import Foundation

/// How a run ended, kept distinct from what it achieved. A quota, a delay or a
/// cancellation is a stopped run, and a window that renders it as an integration
/// is lying about the result.
public enum RunOutcome: Sendable, Equatable {
    case finished(exitCode: Int32)
    case cancelled
    case providerUnavailable(detail: String)
    case quotaOrDelay(detail: String)
    case engineMissing
    case unreadableJournal(detail: String)
}

public struct RunProgress: Sendable, Equatable {
    public let step: RunStepID?
    public let status: RunStepStatus?
    public let line: String
    public let at: Date

    public init(step: RunStepID? = nil, status: RunStepStatus? = nil, line: String, at: Date = Date()) {
        self.step = step
        self.status = status
        self.line = line
        self.at = at
    }
}

/// The four kinds of information the window must never mix. Progress is what the
/// engine did, observations are what the tools said, verdicts come from the
/// existing engine, and human validation is what nobody has done yet.
public struct RunReport: Sendable, Equatable {
    public let outcome: RunOutcome
    public let progress: [RunProgress]
    public let toolObservations: [String]
    public let journal: RunJournal?
    public let diff: String?
    public let unverifiedByAHuman: [String]

    public init(
        outcome: RunOutcome,
        progress: [RunProgress],
        toolObservations: [String],
        journal: RunJournal?,
        diff: String?,
        unverifiedByAHuman: [String]
    ) {
        self.outcome = outcome
        self.progress = progress
        self.toolObservations = toolObservations
        self.journal = journal
        self.diff = diff
        self.unverifiedByAHuman = unverifiedByAHuman
    }

    /// What the window is allowed to say. A run that stopped is not an
    /// integration, and a run whose claims were all settled by a command is not a
    /// Siri conversation.
    public var headline: Headline {
        guard let journal else {
            switch outcome {
            case .finished: return .stopped(reason: "The run ended without a journal.")
            case .cancelled: return .stopped(reason: "Cancelled before the run produced a journal.")
            case let .providerUnavailable(detail): return .stopped(reason: "Provider unavailable. \(detail)")
            case let .quotaOrDelay(detail): return .stopped(reason: "Stopped on a quota or a delay. \(detail)")
            case .engineMissing: return .stopped(reason: "The engine is not installed.")
            case let .unreadableJournal(detail): return .stopped(reason: "The journal could not be read. \(detail)")
            }
        }
        if case .cancelled = outcome { return .stopped(reason: "Cancelled. The journal below is what the run had reached.") }
        guard journal.isComplete else {
            return .stopped(reason: journal.blockingDiagnostic ?? "The run did not reach delivery.")
        }
        return unverifiedByAHuman.isEmpty ? .integrated : .prepared
    }

    public enum Headline: Sendable, Equatable {
        case integrated
        case prepared
        case stopped(reason: String)
    }
}

/// Runs `intentlane pilot run` and reads the journal it writes. The engine is
/// never reimplemented here: this launches it, collects what it printed, and
/// reads `.intentlane/run/journal.json` back through the same schema.
public struct Executor: Sendable {
    public struct Configuration: Sendable {
        public let runDirectoryName: String
        public init(runDirectoryName: String = ".intentlane/run") {
            self.runDirectoryName = runDirectoryName
        }
    }

    private let configuration: Configuration
    private let run: @Sendable (URL, [String], URL) -> (status: Int32, stdout: String, stderr: String)
    private let onLine: @Sendable (RunProgress) -> Void
    private let cancelled: @Sendable () -> Bool

    public init(
        configuration: Configuration = Configuration(),
        onLine: @escaping @Sendable (RunProgress) -> Void = { _ in },
        cancelled: @escaping @Sendable () -> Bool = { false },
        run: @escaping @Sendable (URL, [String], URL) -> (status: Int32, stdout: String, stderr: String) = { exe, args, dir in
            let process = Process()
            process.executableURL = exe
            process.arguments = args
            process.currentDirectoryURL = dir
            let out = Pipe()
            let err = Pipe()
            process.standardOutput = out
            process.standardError = err
            do { try process.run() } catch { return (127, "", String(describing: error)) }
            let outData = out.fileHandleForReading.readDataToEndOfFile()
            let errData = err.fileHandleForReading.readDataToEndOfFile()
            process.waitUntilExit()
            return (process.terminationStatus, String(decoding: outData, as: UTF8.self), String(decoding: errData, as: UTF8.self))
        }
    ) {
        self.configuration = configuration
        self.onLine = onLine
        self.cancelled = cancelled
        self.run = run
    }

    public func runPilot(_ scope: RunScope, pilot: String, planOnly: Bool = false) -> RunReport {
        let journalPath = scope.workingDirectory
            .appendingPathComponent(configuration.runDirectoryName)
            .appendingPathComponent("journal.json")

        var arguments = ["pilot", "run", "--pilot", pilot, "--repository", scope.repository.path, "--run-dir", configuration.runDirectoryName]
        if planOnly { arguments.append("--plan") }

        var progress: [RunProgress] = []
        var observations: [String] = []

        if cancelled() {
            return RunReport(outcome: .cancelled, progress: progress, toolObservations: observations, journal: nil, diff: nil, unverifiedByAHuman: [])
        }

        let result = run(scope.engine, arguments, scope.workingDirectory)
        for raw in (result.stdout + "\n" + result.stderr).split(separator: "\n", omittingEmptySubsequences: true) {
            let line = String(raw)
            let entry = RunProgress(line: line)
            progress.append(entry)
            observations.append(line)
            onLine(entry)
        }

        if cancelled() {
            var partial: RunJournal?
            if let data = try? Data(contentsOf: journalPath) { partial = try? JournalReader.read(data) }
            return RunReport(
                outcome: .cancelled,
                progress: progress,
                toolObservations: observations,
                journal: partial,
                diff: nil,
                unverifiedByAHuman: []
            )
        }

        guard let data = try? Data(contentsOf: journalPath) else {
            return RunReport(
                outcome: .unreadableJournal(detail: "No journal at \(journalPath.path)."),
                progress: progress,
                toolObservations: observations,
                journal: nil,
                diff: nil,
                unverifiedByAHuman: []
            )
        }

        let journal: RunJournal
        do {
            journal = try JournalReader.read(data)
        } catch {
            return RunReport(
                outcome: .unreadableJournal(detail: String(describing: error)),
                progress: progress,
                toolObservations: observations,
                journal: nil,
                diff: nil,
                unverifiedByAHuman: []
            )
        }

        let diff = DiffReader.unifiedDiff(worktree: scope.workingDirectory)
        let unverified = Self.unverifiedByAHuman(journal)

        return RunReport(
            outcome: .finished(exitCode: result.status),
            progress: progress,
            toolObservations: observations,
            journal: journal,
            diff: diff,
            unverifiedByAHuman: unverified
        )
    }

    /// The claims the engine settled by a command are not the same as a person
    /// having tried the journey. The pilot manifest lists the two that no public
    /// API can settle, and the window must keep saying so.
    static func unverifiedByAHuman(_ journal: RunJournal) -> [String] {
        var missing: [String] = []
        if journal.step(.demonstrate)?.status != .pass { missing.append("the demonstrated journey") }
        return missing
    }
}
