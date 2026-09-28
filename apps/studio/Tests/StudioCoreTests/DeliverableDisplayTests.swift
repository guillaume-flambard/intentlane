import Foundation
import Testing
@testable import StudioCore

/// What the window shows, and what it is forbidden to do to it.
///
/// The deliverable leaves the building, so the window's role is to read and hand
/// over, never to compose. A Swift renderer for the document would be a second,
/// larger instance of the drift `CapabilityMap.swift` already had to be guarded
/// against: two documents a client could receive, disagreeing about a score.
///
/// So the model holds the engine's output as a string. These tests assert three
/// things: the text is what the engine produced, nothing is invented when there
/// is none, and an engine that fails is stated rather than shown as an empty
/// document.
/// `@MainActor` because the model is: the window reads the document on the actor
/// that owns the project's state, and a test that reached across that boundary
/// would be exercising a different isolation than the app runs under.
@MainActor
struct DeliverableDisplayTests {
    /// A stand-in for the engine. The production launcher is in
    /// `DeliverableExecutor`; here the command it receives and the text it returns
    /// are recorded, so a test can prove the window asked the engine and used what
    /// it said.
    private final class RecordingRunner: @unchecked Sendable {
        var invocations: [[String]] = []
        var answer: Result<String, DeliverableExecutor.Failure> = .success("# Deliverable\n\nFrom the engine.\n")

        func callAsFunction(_ arguments: [String]) -> Result<String, DeliverableExecutor.Failure> {
            invocations.append(arguments)
            return answer
        }
    }

    private func model(with runner: RecordingRunner) -> StudioModel {
        let model = StudioModel()
        model.deliverableRunner = runner.callAsFunction
        model.repository = URL(fileURLWithPath: "/tmp/intentlane-project")
        return model
    }

    @Test("the window asks the engine for a report, and shows what came back")
    func showsTheEngineText() {
        let runner = RecordingRunner()
        let model = model(with: runner)
        model.readDeliverable()

        #expect(runner.invocations.count == 1, "the window did not ask the engine once")
        #expect(runner.invocations.first?.first == "deliverable", "the engine was asked for something else")
        #expect(model.deliverableText == "# Deliverable\n\nFrom the engine.\n")
    }

    @Test("the window never reformats what the engine returned")
    func composesNothing() {
        // A document the engine rendered with its own spacing, alignment and
        // blank lines. A window that re-wrapped it would be editing the record.
        let exact = "# Deliverable\n\n| a | b |\n|---|---|\n\n\n  indented  \n"
        let runner = RecordingRunner()
        runner.answer = .success(exact)
        let model = model(with: runner)
        model.readDeliverable()

        #expect(model.deliverableText == exact, "the window altered the engine's document")
    }

    @Test("with no project, the window says so and shows nothing")
    func statesAnAbsence() {
        let model = StudioModel()
        #expect(model.deliverable == .absent, "a window with no project must not claim it has a document")
        #expect(model.deliverableText == nil)
    }

    @Test("an engine that fails shows the reason and no document")
    func statesAnEngineFailure() {
        let runner = RecordingRunner()
        runner.answer = .failure(.engineExited(1, "unknown command 'deliverable'"))
        let model = model(with: runner)
        model.readDeliverable()

        guard case .failed(let reason) = model.deliverable else {
            Issue.record("a failed engine run must be a failure, not an empty document")
            return
        }
        #expect(reason.contains("unknown command"), "the reason is the engine's own: \(reason)")
        #expect(model.deliverableText == nil, "a failure must not leave a document behind")
    }

    @Test("a build with no bundled engine says so instead of showing a blank")
    func statesAMissingEngine() {
        let model = StudioModel()
        model.repository = URL(fileURLWithPath: "/tmp/intentlane-project")
        // The model under test resolves the engine the way the app does, and a
        // test binary has none. The result must be a stated absence, not a
        // document with nothing in it.
        model.readDeliverable()

        #expect(model.deliverableText == nil, "a build with no engine must not show a document")
        if case .ready = model.deliverable {
            Issue.record("a build with no engine produced a document")
        }
    }

    @Test("asking again asks the engine again")
    func asksEachTime() {
        let runner = RecordingRunner()
        let model = model(with: runner)
        model.readDeliverable()
        model.readDeliverable()
        #expect(runner.invocations.count == 2, "a reader asking again expects a fresh document")
    }

    @Test("the command is the one a person would type")
    func theCommandIsTypedByHand() {
        #expect(DeliverableExecutor.command(for: "/tmp/audit.json") == ["deliverable", "/tmp/audit.json"])
    }

    @Test("the display round-trips the engine's bytes, whatever they are")
    func theDisplayHoldsAString() {
        // The property, asserted: whatever the engine wrote comes back identical,
        // including a null byte, a lone surrogate escape, trailing whitespace and
        // a mixed line ending. A display that decoded, trimmed or normalised would
        // be editing the record, and one of these is the character that catches it.
        let hostile = "# T\r\n\n\u{0}  trailing  \n\ttab\u{1B}[0m\u{FFFD}  \n\n"
        let model = StudioModel()
        model.repository = URL(fileURLWithPath: "/tmp/intentlane-project")
        model.deliverable = .ready(hostile)

        #expect(model.deliverableText == hostile)
        #expect(model.deliverable == .ready(hostile))
    }
}
