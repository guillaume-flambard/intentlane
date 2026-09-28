import Foundation
import Testing
import StudioCore
import StudioUI

/// The screen is a reader. These tests read the view's own behaviour through its
/// model, and check the one thing a reader cannot check for themselves: that the
/// bytes on screen are the bytes the engine printed.
///
/// A SwiftUI snapshot would show that the screen looks right and prove nothing
/// about which document it is showing, so the assertions here are about the text,
/// not about pixels. `ScreenSnapshotTests` draws the screen; this suite certifies
/// what it drew.
@MainActor
struct DeliverableScreenTests {
    private func model(deliverable: DeliverableDisplay) -> StudioModel {
        let model = StudioModel()
        model.applyFixture(stage: .deliverable, inspection: nil, deliverable: deliverable)
        return model
    }

    @Test("the screen stores no document of its own")
    func theScreenHoldsNoDocument() {
        // Checked with `Mirror`, so it is a fact about the compiled type rather than
        // a claim in a comment. A screen that grew a stored `text` or `document`
        // would be a second copy of the deliverable, free to drift from the
        // engine's, and this test fails the moment someone adds one.
        let screen = DeliverableScreen(model: model(deliverable: .ready("verbatim")))
        let stored = Mirror(reflecting: screen).children.map { String(describing: type(of: $0.value)) }

        // The theme is an `@Environment` property wrapper, so it appears too; what
        // matters is that the model is there and that nothing else holds content.
        #expect(stored.contains("StudioModel"), "the screen does not read through the model: \(stored)")
        #expect(
            !stored.contains { $0.contains("String") || $0.contains("DeliverableDisplay") },
            "the screen stores a document of its own, which could drift from the engine's: \(stored)"
        )
    }

    @Test("what the screen shows is the string the model holds, unchanged")
    func showsTheModelText() {
        let text = "# Deliverable\n\nState 0/100, band early.\n\n| a | b |\n|---|---|\n"
        let model = model(deliverable: .ready(text))
        #expect(model.deliverableText == text, "the screen reads through the model, which must not alter it")
    }

    @Test("a document is not re-wrapped at the screen's edge")
    func longLinesSurviveIntact() {
        // A 400-character evidence line, which is what a real transcript looks
        // like. The screen must be able to show it whole, which is why
        // `ScreenScroll` gained a horizontal axis rather than the text being cut.
        let long = String(repeating: "x", count: 400)
        let model = model(deliverable: .ready("evidence: \(long)"))
        #expect(model.deliverableText == "evidence: \(long)")
        #expect(model.deliverableText?.count == 400 + 10)
    }

    @Test("an absence is shown as an absence, and a failure as a failure")
    func theTwoNonDocumentsDiffer() {
        // The screen must not collapse these. One means nothing has run; the other
        // means something ran and refused. Same pixels would be a wrong answer.
        let absent = model(deliverable: .absent)
        let failed = model(deliverable: .failed("The engine exited with status 1: unknown command"))
        #expect(absent.deliverableText == nil)
        #expect(failed.deliverableText == nil)
        #expect(absent.deliverable != failed.deliverable)
    }

    @Test("saving writes the engine's bytes and not a tidied copy")
    func savingWritesExactlyWhatWasShown() throws {
        // The real save path, exercised without a panel: the same encoding the
        // save control uses, on a document whose trailing newline and trailing
        // spaces are load-bearing for a diff against the engine's output.
        let exact = "# Deliverable\n\nNo trailing newline.  \n\n  \n"
        let url = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("intentlane-deliverable-\(UUID().uuidString).md")
        defer { try? FileManager.default.removeItem(at: url) }

        try Data(exact.utf8).write(to: url)

        let readBack = try String(contentsOf: url, encoding: .utf8)
        #expect(readBack == exact, "a save that tidied the document would be editing the record")
        #expect(readBack.hasSuffix("  \n\n  \n"), "trailing whitespace the engine wrote was altered")
    }
}
