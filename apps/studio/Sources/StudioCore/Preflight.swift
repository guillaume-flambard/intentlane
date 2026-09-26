import Foundation

/// A command the studio may run on the user's behalf, and the scope it carries.
///
/// Nothing runs before one of these is shown. A repository's own build scripts
/// execute, so "I will run this" has to name what executes, where it writes, and
/// whether any of it leaves the machine.
public struct RunScope: Sendable, Equatable {
    public let repository: URL
    public let commit: String
    public let branch: String
    public let workingDirectory: URL
    public let engine: URL
    public let provider: Provider
    public let sendsCodeToModel: Bool

    public init(
        repository: URL,
        commit: String,
        branch: String,
        workingDirectory: URL,
        engine: URL,
        provider: Provider,
        sendsCodeToModel: Bool
    ) {
        self.repository = repository
        self.commit = commit
        self.branch = branch
        self.workingDirectory = workingDirectory
        self.engine = engine
        self.provider = provider
        self.sendsCodeToModel = sendsCodeToModel
    }
}

public enum Provider: String, Sendable, Equatable, CaseIterable {
    case localEngine = "local-engine"
    case openCode = "opencode"

    public var label: String {
        switch self {
        case .localEngine: "Local engine only"
        case .openCode: "OpenCode, locally installed"
        }
    }
}

/// What the window must be able to say before the user approves anything.
public struct Preflight: Sendable, Equatable {
    public let scope: RunScope
    public let enginePresent: Bool
    public let engineVersion: String?
    public let providerPresent: Bool
    public let providerVersion: String?
    public let writesInsideWorkingDirectoryOnly: Bool
    public let findings: [Finding]

    public struct Finding: Sendable, Equatable, Identifiable {
        public enum Severity: String, Sendable, Equatable { case blocking, advisory }
        public let id: String
        public let severity: Severity
        public let message: String

        public init(id: String, severity: Severity, message: String) {
            self.id = id
            self.severity = severity
            self.message = message
        }
    }

    public var isRunnable: Bool { !findings.contains { $0.severity == .blocking } }
}

public enum PreflightBuilder {
    /// Collects what the run needs and what it would touch, without running any
    /// of it. Every probe here is a read: `git rev-parse`, a file existence check,
    /// and a version query. Nothing from the repository is executed to produce a
    /// preflight, because producing it must not be the thing that runs the code.
    public static func build(
        scope: RunScope,
        isExecutable: (String) -> Bool = { FileManager.default.isExecutableFile(atPath: $0) },
        run: @escaping (URL, [String]) -> (status: Int32, stdout: String, stderr: String) = Shell.run
    ) -> Preflight {
        var findings: [Preflight.Finding] = []

        let enginePresent = isExecutable(scope.engine.path)
        let engineVersion = enginePresent ? run(scope.engine, ["--version"]).stdout.trimmed : nil
        if !enginePresent {
            findings.append(.init(
                id: "engine-missing",
                severity: .blocking,
                message: "The engine is not at \(scope.engine.path). Build it with pnpm bundle, or choose another engine."
            ))
        }

        var providerPresent = true
        var providerVersion: String?
        if scope.provider == .openCode {
            let probe = run(URL(fileURLWithPath: "/usr/bin/env"), ["opencode", "--version"])
            providerPresent = probe.status == 0 && !probe.stdout.trimmed.isEmpty
            providerVersion = providerPresent ? probe.stdout.trimmed : nil
            if !providerPresent {
                findings.append(.init(
                    id: "provider-unavailable",
                    severity: .blocking,
                    message: "OpenCode is not on PATH, so the run cannot be repaired by an agent. The engine can still run the local steps."
                ))
            }
        }

        // The scope has to be inside the worktree, or the run can write to the
        // user's own checkout, which is the one thing this may never do.
        let working = scope.workingDirectory.standardizedFileURL.path
        let repository = scope.repository.standardizedFileURL.path
        let writesInside = working.hasPrefix(repository) && working != repository
        if !writesInside {
            findings.append(.init(
                id: "scope-escapes-repository",
                severity: .blocking,
                message: "The run directory \(working) is not a subdirectory of the repository \(repository)."
            ))
        }

        let head = run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", scope.workingDirectory.path, "rev-parse", "HEAD"]).stdout.trimmed
        if head != scope.commit {
            findings.append(.init(
                id: "commit-moved",
                severity: .blocking,
                message: "The working directory is at \(head.isEmpty ? "no commit" : head), not the chosen \(scope.commit)."
            ))
        }

        if scope.sendsCodeToModel {
            findings.append(.init(
                id: "code-leaves-machine",
                severity: .advisory,
                message: "This run sends code to a model provider. The diff and the journal stay local."
            ))
        }

        return Preflight(
            scope: scope,
            enginePresent: enginePresent,
            engineVersion: engineVersion,
            providerPresent: providerPresent,
            providerVersion: providerVersion,
            writesInsideWorkingDirectoryOnly: writesInside,
            findings: findings
        )
    }
}

public enum Shell {
    @discardableResult
    public static func run(_ executable: URL, _ arguments: [String]) -> (status: Int32, stdout: String, stderr: String) {
        let process = Process()
        process.executableURL = executable
        process.arguments = arguments
        let out = Pipe()
        let err = Pipe()
        process.standardOutput = out
        process.standardError = err
        do {
            try process.run()
        } catch {
            return (127, "", String(describing: error))
        }
        let outData = out.fileHandleForReading.readDataToEndOfFile()
        let errData = err.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        return (process.terminationStatus, String(decoding: outData, as: UTF8.self), String(decoding: errData, as: UTF8.self))
    }
}

extension String {
    /// Used by the window as well as the executor, so the trimming rule is one rule.
    public var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}
