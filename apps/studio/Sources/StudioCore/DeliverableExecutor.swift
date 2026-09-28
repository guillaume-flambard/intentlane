import Foundation

/// Asks the engine to render the deliverable, and hands back exactly what it
/// printed.
///
/// The window never composes the document. It launches the same binary the CLI
/// launches, with the same arguments a person would type, and keeps what came
/// back. That is the whole reason the text in the window can be compared to the
/// file the command writes for the same report: there is only one of them.
public struct DeliverableExecutor: Sendable {
    /// Why there is no document. The engine's own words, so a reader is not asked
    /// to guess whether the problem is the engine, the report, or the window.
    public enum Failure: Sendable, Equatable, Error {
        /// The engine ran and said no. The second value is what it printed.
        case engineExited(Int32, String)
        /// The engine could not be launched at all.
        case engineUnavailable(String)

        public var reason: String {
            switch self {
            case .engineExited(let code, let output):
                let detail = output.trimmingCharacters(in: .whitespacesAndNewlines)
                return detail.isEmpty
                    ? "The engine exited with status \(code) and printed nothing."
                    : "The engine exited with status \(code): \(detail)"
            case .engineUnavailable(let detail):
                return "The engine could not be launched: \(detail)"
            }
        }
    }

    /// Runs the engine with the given arguments. Injected so a test can assert the
    /// command and the text without launching anything.
    public typealias Runner = @Sendable ([String]) -> Result<String, Failure>

    private let engine: URL
    // Named again with `@escaping` because a typealias of a function type does not
    // carry it, and the runner is stored for the lifetime of the executor.
    private let run: @Sendable ([String]) -> Result<String, Failure>

    public init(engine: URL, run: @escaping Runner) {
        self.engine = engine
        self.run = run
    }

    public init(engine: URL) {
        self.init(engine: engine, run: { arguments in
            let process = Process()
            process.executableURL = engine
            process.arguments = arguments
            let output = Pipe()
            let errors = Pipe()
            process.standardOutput = output
            process.standardError = errors
            do {
                try process.run()
            } catch {
                return .failure(.engineUnavailable(String(describing: error)))
            }
            // Both pipes are drained before waiting: a process that fills a pipe
            // buffer blocks on write, and a reader that waits first would wait
            // forever. The engine writes a document to stdout, so this is the
            // difference between working and hanging.
            let out = output.fileHandleForReading.readDataToEndOfFile()
            let err = errors.fileHandleForReading.readDataToEndOfFile()
            process.waitUntilExit()

            guard process.terminationStatus == 0 else {
                return .failure(
                    .engineExited(
                        process.terminationStatus,
                        String(decoding: out + err, as: UTF8.self)
                    )
                )
            }
            return .success(String(decoding: out, as: UTF8.self))
        })
    }

    /// Runs the engine with the given arguments. The public door to the real
    /// launcher, so a caller with an injected runner is not forced to rebuild the
    /// executor just to reach the process it would otherwise launch.
    public func launch(_ arguments: [String]) -> Result<String, Failure> {
        run(arguments)
    }

    /// Renders the deliverable for a report on disk, through the engine.
    ///
    /// The arguments are the ones a person would type, so the document the window
    /// shows and the document a person produces by hand are the same document.
    public func render(reportPath: String) -> Result<String, Failure> {
        guard engine.path != "/missing" else {
            return .failure(.engineUnavailable("no engine is bundled with this build"))
        }
        return run(Self.command(for: reportPath))
    }

    /// The command line, in one place, so a test can assert it without a process.
    public static func command(for reportPath: String) -> [String] {
        ["deliverable", reportPath]
    }
}
