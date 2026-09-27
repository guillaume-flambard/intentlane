import SwiftUI
import StudioCore

/// The window. Five screens, one journey, and a persistent answer to "is my own
/// checkout safe". There is no sidebar, because the user works on a project and a
/// journey, not on a catalogue of sections.
public struct StudioView: View {
    @State private var model: StudioModel

    public init() {
        _model = State(initialValue: StudioModel())
    }

    /// The window builds its own model. A view handed one is being rendered by
    /// something that needs a particular state, such as the snapshot harness, and it
    /// runs the same view code either way.
    public init(model: StudioModel) {
        _model = State(initialValue: model)
    }

    public var body: some View {
        Themed { _ in
            Group {
                if model.reviewingChanges {
                    ChangeReview(model: model)
                } else {
                    screens
                }
            }
            // The window fills its frame, and so does every renderer that draws this
            // view, so a snapshot is the screen and not a screen floating in a
            // letterboxed rectangle. Content taller than the frame is anchored at
            // the top, because a window shows the beginning of its content and a
            // centre crop would hide the header of a long screen.
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .frame(minWidth: 1000, minHeight: 700)
        }
    }

    @ViewBuilder
    private var screens: some View {
        switch model.stage {
        case .project:
            ProjectScreen(model: model, choose: chooseRepository)
        case .capabilities:
            CapabilitiesScreen(model: model)
        case .goal:
            GoalScreen(model: model)
        case .plan:
            PlanScreen(model: model)
        case .run:
            RunScreen(model: model)
        case .result:
            ResultScreen(model: model)
        }
    }

    private func chooseRepository() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.message = "Choose the application repository IntentLane will work in a worktree."
        if panel.runModal() == .OK, let url = panel.url {
            model.inspect(url)
        }
    }
}
