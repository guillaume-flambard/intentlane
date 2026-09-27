import SwiftUI
import StudioCore

/// Screen one. The only thing asked for is a project, and the promise is made before
/// anything is chosen: the working copy is isolated and the current branch stays
/// untouched.
public struct ProjectScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel
    let choose: () -> Void

    public var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: Space.s6) {
                Spacer(minLength: Space.s8)
                Text("Drop your app project")
                    .font(Type.hero)
                    .foregroundStyle(theme.text)
                Text("IntentLane works in an isolated workspace. Your current branch stays untouched.")
                    .font(Type.body)
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
                    .fixedSize(horizontal: false, vertical: true)

                ProjectDropZone()

                HStack(spacing: Space.s3) {
                    Button("Choose project", action: choose)
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    Button("Open recent") {}
                        .disabled(true)
                        .controlSize(.large)
                        .help("No run has been made from this application yet.")
                }

                if let facts = model.facts {
                    ProjectFactsList(facts: facts)
                        .frame(maxWidth: 520)
                }
                Spacer(minLength: Space.s6)
            }
            .frame(maxWidth: .infinity)

            if model.facts != nil {
                Divider()
                footer
            }
        }
    }

    private var footer: some View {
        HStack {
            // One source for the reason, so the disabled button and the sentence
            // beside it can never tell the reader two different things.
            if !model.canContinueToGoal {
                Text(model.blockingHint)
                    .font(Type.metadata)
                    .foregroundStyle(theme.warning)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Button("Capability map") { model.openCapabilities() }
                .controlSize(.large)
                .disabled(model.facts == nil)
                .help("Read the engine's audit of this project and show what Apple can already do with it.")
            Button("Continue") { model.advanceToGoal() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!model.canContinueToGoal)
                .keyboardShortcut(.defaultAction)
        }
        .padding(.horizontal, Space.s6)
        .padding(.vertical, Space.s4)
    }
}

struct ProjectDropZone: View {
    @Environment(\.intentLaneTheme) private var theme
    @State private var isTargeted = false

    var body: some View {
        RoundedRectangle(cornerRadius: Radius.dropZone, style: .continuous)
            .fill(isTargeted ? theme.signalSoft : theme.surface)
            .overlay {
                RoundedRectangle(cornerRadius: Radius.dropZone, style: .continuous)
                    .stroke(
                        isTargeted ? theme.signal : theme.line,
                        style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
                    )
            }
            .frame(width: 420, height: 150)
            .overlay {
                VStack(spacing: Space.s2) {
                    Image(systemName: "square.and.arrow.down")
                        .font(.system(size: 22))
                        .foregroundStyle(theme.textSecondary)
                    Text("A folder with your Xcode project")
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                }
            }
            .accessibilityElement()
            .accessibilityLabel("Drop zone. Drop a folder containing your Xcode project, or use the Choose project button.")
    }
}

struct ProjectFactsList: View {
    @Environment(\.intentLaneTheme) private var theme
    let facts: ProjectFacts

    private var rows: [(String, String)] {
        var out: [(String, String)] = [
            ("Repository", facts.repositoryPath),
            ("Branch", facts.branch),
            ("Revision", facts.revision),
            ("Detected targets", facts.xcodeProject ?? "no Xcode project at the root"),
            ("Platform", facts.platform)
        ]
        if !facts.uncommitted.isEmpty {
            out.append(("Uncommitted", "\(facts.uncommitted.count) file(s) in your checkout"))
        }
        return out
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            ForEach(rows, id: \.0) { row in
                HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                    Text(row.0)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                        .frame(width: 130, alignment: .leading)
                    Text(row.1)
                        .font(Type.monoSmall)
                        .foregroundStyle(theme.text)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(rows.map { "\($0.0): \($0.1)" }.joined(separator: ". "))
    }
}
