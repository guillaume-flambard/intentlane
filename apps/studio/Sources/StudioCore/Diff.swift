import Foundation

/// Reads what a run actually changed, and proves the user's own checkout was not
/// one of the things it changed.
public enum DiffReader {
    @discardableResult
    static func unifiedDiff(worktree: URL) -> String? {
        let result = Shell.run(
            URL(fileURLWithPath: "/usr/bin/git"),
            ["-C", worktree.path, "diff", "HEAD"]
        )
        let text = result.stdout
        return text.trimmed.isEmpty ? nil : text
    }

    /// The user's repository state before the run, so the window can assert it is
    /// unchanged afterwards rather than promise it.
    public struct RepositoryState: Sendable, Equatable {
        public let head: String
        public let branch: String
        public let staged: [String]
        public let untracked: [String]

        public init(head: String, branch: String, staged: [String], untracked: [String]) {
            self.head = head
            self.branch = branch
            self.staged = staged
            self.untracked = untracked
        }
    }

    public enum Unchanged: Equatable, Sendable {
        case untouched
        case changed(what: String)
    }

    /// What a run changed, file by file, with the origin of each one. The origin is
    /// derived from the names the generator and the engine actually use, so a file
    /// is never labelled "generated" because it looked machine written.
    public struct ChangedFile: Sendable, Equatable, Identifiable {
        public enum Origin: String, Sendable, Equatable {
            case generated = "IntentLane generated"
            case adapter = "Agent adapted"
            case test = "Test"
            case existing = "Existing code"

            public var symbol: String {
                switch self {
                case .generated: "wand.and.stars"
                case .adapter: "wrench.and.screwdriver"
                case .test: "checkmark.seal"
                case .existing: "doc.text"
                }
            }
        }

        public enum Change: String, Sendable, Equatable {
            case added, modified, deleted, renamed, untracked
        }

        public let id: String
        public let path: String
        public let origin: Origin
        public let change: Change

        public init(path: String, origin: Origin, change: Change) {
            self.id = path
            self.path = path
            self.origin = origin
            self.change = change
        }
    }

    public static let generatedFileName = "IntentLaneGenerated.swift"
    public static let adapterFileName = "IntentLaneAdapter.swift"

    public static func changedFiles(worktree: URL) -> [ChangedFile] {
        let output = Shell.run(
            URL(fileURLWithPath: "/usr/bin/git"),
            ["-C", worktree.path, "status", "--porcelain", "-uall"]
        ).stdout
        return output.split(separator: "\n").compactMap { raw in
            let line = String(raw)
            guard line.count > 3 else { return nil }
            let code = String(line.prefix(2))
            let path = String(line.dropFirst(3))
            guard !path.isEmpty else { return nil }

            let change: ChangedFile.Change
            switch code.trimmingCharacters(in: .whitespaces) {
            case "??": change = .untracked
            case "M", "MM", " T": change = .modified
            case "A", "AM": change = .added
            case "D": change = .deleted
            case "R", "C": change = .renamed
            default: change = .modified
            }

            let origin: ChangedFile.Origin
            if path.hasSuffix(generatedFileName) {
                origin = .generated
            } else if path.contains("/IntentLane/") || path.hasSuffix(adapterFileName) {
                origin = .adapter
            } else if path.contains("/Tests/") || path.contains("/tests/") {
                origin = .test
            } else {
                origin = .existing
            }
            return ChangedFile(path: path, origin: origin, change: change)
        }
    }

    public static func state(of repository: URL) -> RepositoryState {
        func lines(_ arguments: [String]) -> [String] {
            Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path] + arguments)
                .stdout.split(separator: "\n")
                .map { $0.trimmingCharacters(in: CharacterSet(charactersIn: " \t")) }
                .filter { !$0.isEmpty }
        }
        return RepositoryState(
            head: Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path, "rev-parse", "HEAD"]).stdout.trimmed,
            branch: Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trimmed,
            staged: lines(["diff", "--cached", "--name-only"]),
            untracked: lines(["ls-files", "--others", "--exclude-standard"])
        )
    }

    /// Compares the user's own checkout before and after. The run happens in a
    /// worktree, so this is expected to be `.untouched`; the check exists so that
    /// expectation is measured rather than asserted.
    public static func verify(_ before: RepositoryState, _ after: RepositoryState) -> Unchanged {
        if before.head != after.head { return .changed(what: "HEAD moved from \(before.head) to \(after.head)") }
        if before.branch != after.branch { return .changed(what: "the branch moved from \(before.branch) to \(after.branch)") }
        if before.staged != after.staged { return .changed(what: "the staging area changed") }
        if before.untracked != after.untracked { return .changed(what: "the untracked files changed") }
        return .untouched
    }

    /// The integrations this build can drive, taken from what the engine's
    /// pilot manifest actually claims rather than from a label.
    public struct SupportedIntegration: Sendable, Identifiable, Equatable {
        public let id: String
        public let name: String
        public let summary: String
        public let claims: [String]
    }

    /// Reads a pilot manifest and reports what it claims, so the window offers a
    /// journey with its real scope instead of a marketing line.
    public static func supportedIntegrations(manifestDirectory: URL) -> [SupportedIntegration] {
        let manifest = manifestDirectory.appendingPathComponent("pilot.yaml")
        guard let text = try? String(contentsOf: manifest, encoding: .utf8) else { return [] }

        var claims: [String] = []
        var inClaims = false
        for raw in text.split(separator: "\n", omittingEmptySubsequences: true) {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("claims:") { inClaims = true; continue }
            if inClaims {
                if line.hasPrefix("- ") {
                    claims.append(String(line.dropFirst(2)).trimmed)
                } else if !line.isEmpty && !line.hasPrefix("#") {
                    inClaims = false
                }
            }
        }

        let name = manifestDirectory.lastPathComponent
        return [
            SupportedIntegration(
                id: name,
                name: name,
                summary: "Opens one object through the existing application surface, with no write intent.",
                claims: claims
            )
        ]
    }
}
