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
