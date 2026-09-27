import Foundation

/// Runs `intentlane audit` on the project's own repository and parses the report
/// it produces. The running application is never suspected by this executor: the
/// engine is the same binary the window launches for a pilot run, and the only
/// question it is being asked is the audit question.
///
/// Nothing here reimplements the audit. This launches it, collects what it
/// printed, and parses the JSON it wrote, so a screen cannot show a capability the
/// engine did not classify.
public struct AuditExecutor: Sendable {
    public struct Result: Sendable, Equatable {
        public let exitCode: Int32
        public let observations: [String]
        public let report: AuditReportMirror?

        init(exitCode: Int32, observations: [String], report: AuditReportMirror?) {
            self.exitCode = exitCode
            self.observations = observations
            self.report = report
        }
    }

    private let run: @Sendable (URL, [String], URL) -> (status: Int32, stdout: String, stderr: String)

    public init(
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
        self.run = run
    }

    /// The engine's SDK-aware audit. One invocation, one report. There is no
    /// permission to retry and no permission to add a flag later: the audit is
    /// read-only and every argument lives here, so what this window runs is
    /// visible from anywhere.
    public func runAudit(scope: RunScope, platform: String = "macos") -> Result {
        // The engine runs against the isolated worktree for the same reason the
        // pilot run does: pointing it at the repository would index the worktree a
        // second time and report every object twice.
        let arguments = [
            "audit", scope.workingDirectory.path,
            "--platform", platform,
            "--format", "json"
        ]

        let result = run(scope.engine, arguments, scope.workingDirectory)
        let observations: [String] = (result.stdout + "\n" + result.stderr).split(separator: "\n", omittingEmptySubsequences: true).map(String.init)

        guard result.status == 0 else {
            return Result(
                exitCode: result.status,
                observations: observations,
                report: nil
            )
        }

        let report = AuditReportParser.parse(Data(result.stdout.utf8))
        return Result(
            exitCode: result.status,
            observations: observations,
            report: report
        )
    }
}
