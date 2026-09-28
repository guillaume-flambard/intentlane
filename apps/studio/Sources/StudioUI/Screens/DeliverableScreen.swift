import SwiftUI
import StudioCore

/// The document that leaves the building, shown exactly as the engine wrote it.
///
/// The screen has one job: put the engine's text in front of a person and let them
/// save it. It does not render the document, does not summarise it, and does not
/// replace a word of it. A view that reformatted the text would be a second
/// deliverable, and a client receiving two of them would have no way to tell which
/// one the audit produced.
///
/// The three states are stated rather than implied. No document reads as a stated
/// absence. A failure reads as the engine's own words, because a reader cannot act
/// on "something went wrong" and can act on what the engine said.
public struct DeliverableScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    let model: StudioModel

    public init(model: StudioModel) {
        self.model = model
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Divider()
            switch model.deliverable {
            case .absent:
                stated(
                    title: "No document yet",
                    detail: "The deliverable is rendered from the report an audit writes, so there is nothing to show until an audit has run."
                )
            case .failed(let reason):
                stated(title: "The engine produced no document", detail: reason)
            case .ready(let text):
                document(text)
            }
        }
        .task { model.readDeliverable() }
    }

    /// A stated absence, and a stated failure, in the same shape.
    ///
    /// Both are the reader's own conclusion drawn from the screen, not the screen's
    /// guess about it. "No document yet" and "the engine refused" are different
    /// facts with different next steps, and a screen that collapsed them would send
    /// a reader looking for a bug that is not there.
    private func stated(title: String, detail: String) -> some View {
        ScreenScroll {
            VStack(alignment: .leading, spacing: Space.s2) {
                Text(title)
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                Text(detail)
                    .font(Type.body)
                    .foregroundStyle(theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(Space.s8)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }

    /// The engine's text, and nothing around it but the fact and a save control.
    ///
    /// A monospaced, horizontally scrollable, selectable text view is the only
    /// honest container for a document a person will copy from or save: every glyph
    /// the engine produced is on screen, in order, and the view cannot re-wrap,
    /// hyphenate or re-space them. The content is opaque, not glass, because this is
    /// text a person reads rather than a control they push.
    private func document(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: Space.s1) {
                Text("Deliverable")
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                    Text("Rendered by the engine from the audit report. Shown verbatim: this screen never rewrites the document.")
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                    Spacer()
                    DeliverableSave(text: text)
                }
            }
            .padding(Space.s8)

            Divider()

            ScreenScroll([.horizontal, .vertical]) {
                Text(text)
                    .font(.system(size: 13, design: .monospaced))
                    .textSelection(.enabled)
                    .fixedSize(horizontal: true, vertical: false)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Space.s8)
            }
        }
    }
}

/// Saves exactly the bytes on screen, and says where they went.
///
/// The write is the document as displayed: no trailing newline added, nothing
/// stripped, so the file a person keeps is byte-identical to what the engine
/// printed. A save that appended a newline would be a small lie, because the file
/// would no longer be what the audit produced and a diff against the engine's own
/// output would show a change nobody made.
private struct DeliverableSave: View {
    @Environment(\.intentLaneTheme) private var theme
    let text: String

    @State private var outcome: String?

    var body: some View {
        VStack(alignment: .trailing, spacing: Space.s1) {
            Button("Save DELIVERABLE.md") { save() }
                .buttonStyle(.borderedProminent)
            if let outcome {
                Text(outcome)
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
            }
        }
    }

    private func save() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "DELIVERABLE.md"
        panel.canCreateDirectories = true
        guard panel.runModal() == .OK, let url = panel.url else {
            outcome = "Not saved."
            return
        }
        do {
            try Data(text.utf8).write(to: url)
            outcome = "Saved \(url.lastPathComponent)."
        } catch {
            // A failed save is stated. Doing nothing silently after a person chose
            // a file is how a deliverable gets lost on the way out of the building.
            outcome = "Not saved: \(error.localizedDescription)"
        }
    }
}
