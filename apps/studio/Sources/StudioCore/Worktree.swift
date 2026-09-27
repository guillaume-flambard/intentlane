import Foundation

/// Creates the isolated worktree a run happens in, without changing anything the
/// user can see in their own checkout.
///
/// The worktree lives at `<repository>/.worktrees/<name>`, which is where the
/// projects convention says a worktree belongs. That has one cost, and it is not
/// hypothetical: a directory inside the repository shows up in `git status` as
/// untracked content, so the user's untracked set changes the moment a run starts.
/// The fix is `.git/info/exclude`, which is local to the clone, is not a tracked
/// file, and is never committed or pushed. `.gitignore` would be the wrong
/// instrument: it is tracked, so writing it would be a change to the user's
/// repository in order to run a tool in it.
public enum Worktree {
    public static let directoryName = ".worktrees"

    public enum Failure: Error, Equatable, Sendable {
        case notARepository(String)
        case revisionUnknown(String)
        case alreadyExists(String)
        case excludeNotWritable(String)
    }

    /// Adds the worktree directory to the clone's local exclude file, and reports
    /// whether it had to. Idempotent, because the app may be opened repeatedly.
    @discardableResult
    public static func excludeLocally(_ repository: URL, name: String = directoryName) throws -> Bool {
        let exclude = repository.appendingPathComponent(".git/info/exclude")
        guard FileManager.default.fileExists(atPath: repository.appendingPathComponent(".git").path) else {
            throw Failure.notARepository(repository.path)
        }
        let line = "\(name)/"
        let existing = (try? String(contentsOf: exclude, encoding: .utf8)) ?? ""
        if existing.split(separator: "\n").contains(Substring(line)) { return false }

        let directory = exclude.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var next = existing
        if !next.isEmpty, !next.hasSuffix("\n") { next += "\n" }
        next += "# Added by IntentLane Studio, local to this clone, never committed.\n\(line)\n"
        do {
            try next.write(to: exclude, atomically: true, encoding: .utf8)
        } catch {
            throw Failure.excludeNotWritable(exclude.path)
        }
        return true
    }

    /// Creates the worktree at an explicitly chosen revision. Never checks out a
    /// branch, never switches the user's own checkout, and refuses rather than
    /// reusing an existing directory.
    public static func create(
        repository: URL,
        name: String,
        commit: String
    ) throws -> URL {
        let worktree = repository.appendingPathComponent("\(directoryName)/\(name)")
        guard FileManager.default.fileExists(atPath: repository.appendingPathComponent(".git").path) else {
            throw Failure.notARepository(repository.path)
        }
        if FileManager.default.fileExists(atPath: worktree.path) {
            throw Failure.alreadyExists(worktree.path)
        }
        let known = Shell.run(
            URL(fileURLWithPath: "/usr/bin/git"),
            ["-C", repository.path, "rev-parse", "--verify", "--quiet", "\(commit)^{commit}"]
        )
        guard known.status == 0, !known.stdout.trimmed.isEmpty else {
            throw Failure.revisionUnknown(commit)
        }
        try excludeLocally(repository, name: directoryName)
        let added = Shell.run(
            URL(fileURLWithPath: "/usr/bin/git"),
            ["-C", repository.path, "worktree", "add", "--detach", worktree.path, commit]
        )
        guard added.status == 0 else {
            throw Failure.revisionUnknown(added.stderr.trimmed)
        }
        return worktree
    }
}
