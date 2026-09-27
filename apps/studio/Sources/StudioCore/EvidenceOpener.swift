import Foundation

/// Opens an evidence path the report already names, in Xcode, at the line the
/// report already names. The path is resolved against the worktree the audit
/// inspected, because the report's paths belong to that worktree and not to the
/// reader's own checkout.
///
/// Nothing is opened when the file is not there: an opener that fails silently is
/// indistinguishable from evidence that does not exist, so the caller asks first
/// and the button is disabled rather than dead.
public struct EvidenceOpener: Sendable {
    public typealias Runner = @Sendable (URL, [String]) -> Void

    private let run: Runner

    public init(
        run: @escaping Runner = { executable, arguments in
            let process = Process()
            process.executableURL = executable
            process.arguments = arguments
            try? process.run()
        }
    ) {
        self.run = run
    }

    public static let xed = URL(fileURLWithPath: "/usr/bin/xed")

    /// An absolute path is used as it is; a relative one belongs to the worktree.
    /// The join is done by hand because `URL(fileURLWithPath:relativeTo:)` does
    /// not keep the base for a relative path, and a path silently resolved against
    /// something else would open the wrong file or none.
    public static func resolve(path: String, in worktree: URL) -> URL {
        if path.hasPrefix("/") {
            return URL(fileURLWithPath: path).standardizedFileURL
        }
        return worktree.appendingPathComponent(path).standardizedFileURL
    }

    public func canOpen(path: String?, in worktree: URL) -> Bool {
        guard let path, !path.isEmpty else { return false }
        return FileManager.default.fileExists(atPath: Self.resolve(path: path, in: worktree).path)
    }

    /// The line goes to `xed -l` only when the report named one, and the file last,
    /// which is the order `xed` reads them in.
    public func open(path: String?, line: Int?, in worktree: URL) {
        guard let path, canOpen(path: path, in: worktree) else { return }
        let file = Self.resolve(path: path, in: worktree)
        var arguments: [String] = []
        if let line {
            arguments += ["-l", String(line)]
        }
        arguments.append(file.path)
        run(Self.xed, arguments)
    }
}
