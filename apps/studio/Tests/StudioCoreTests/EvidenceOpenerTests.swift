import Testing
import Foundation
@testable import StudioCore

/// The evidence button, asserted on the command it would launch: a path the report
/// named, at the line the report named, resolved against the worktree the audit
/// inspected, and nothing at all when the file is not there.
struct EvidenceOpenerTests {
    /// Records instead of launching, so the command is the thing under test and
    /// Xcode is never opened by a test run.
    private final class Recorder: @unchecked Sendable {
        var calls: [(executable: URL, arguments: [String])] = []
    }

    private func withWorktree(_ body: (URL, EvidenceOpener, Recorder) throws -> Void) throws {
        let worktree = FileManager.default.temporaryDirectory
            .appendingPathComponent("intentlane-evidence-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: worktree, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: worktree) }

        let source = worktree.appendingPathComponent("Sources/App.swift")
        try FileManager.default.createDirectory(
            at: source.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try Data("struct App {}".utf8).write(to: source)

        let recorder = Recorder()
        let opener = EvidenceOpener { executable, arguments in
            recorder.calls.append((executable, arguments))
        }
        try body(worktree, opener, recorder)
    }

    @Test func aNamedLineIsPassedToXedAsALineFlag() throws {
        try withWorktree { worktree, opener, recorder in
            opener.open(path: "Sources/App.swift", line: 42, in: worktree)
            #expect(recorder.calls.count == 1)
            let call = try #require(recorder.calls.first)
            #expect(call.executable == EvidenceOpener.xed)
            #expect(call.arguments == ["-l", "42", worktree.appendingPathComponent("Sources/App.swift").path])
        }
    }

    @Test func aPathWithNoLineOpensTheFileAlone() throws {
        try withWorktree { worktree, opener, recorder in
            opener.open(path: "Sources/App.swift", line: nil, in: worktree)
            #expect(recorder.calls.count == 1)
            let call = try #require(recorder.calls.first)
            #expect(call.arguments == [worktree.appendingPathComponent("Sources/App.swift").path])
        }
    }

    @Test func aFileThatIsNotThereIsNotOpened() throws {
        try withWorktree { worktree, opener, recorder in
            #expect(opener.canOpen(path: "Sources/Gone.swift", in: worktree) == false)
            opener.open(path: "Sources/Gone.swift", line: 1, in: worktree)
            #expect(recorder.calls.isEmpty, "a missing file must not be handed to xed")
        }
    }

    @Test func noPathAtAllIsNotOpenable() throws {
        try withWorktree { worktree, opener, _ in
            #expect(opener.canOpen(path: nil, in: worktree) == false)
            #expect(opener.canOpen(path: "", in: worktree) == false)
        }
    }

    @Test func anAbsolutePathIsUsedAsItIsAndARelativeOneBelongsToTheWorktree() throws {
        try withWorktree { worktree, _, _ in
            let absolute = EvidenceOpener.resolve(path: "/tmp/already/absolute.swift", in: worktree)
            #expect(absolute.path == "/tmp/already/absolute.swift")
            let relative = EvidenceOpener.resolve(path: "Sources/App.swift", in: worktree)
            #expect(relative.path == worktree.appendingPathComponent("Sources/App.swift").path)
        }
    }
}
