import SwiftUI
import StudioCore

/// A temporary surface for the question "what changed, and why". It is not an IDE
/// and it does not pretend to be one: a file list, the diff, and the origin of each
/// file, which is what separates generated code from a change a person has to read.
public struct ChangeReview: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Review changes")
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                Spacer()
                Button("Done") { model.reviewingChanges = false }
                    .keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, Space.s6)
            .padding(.vertical, Space.s4)

            Divider()

            HSplitView {
                fileList
                    .frame(minWidth: 260, idealWidth: 320, maxWidth: 420)
                diffPane
                    .frame(minWidth: 320)
            }
        }
    }

    private var fileList: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Files (\(model.changedFiles.count))")
                .font(Type.metadataMedium)
                .foregroundStyle(theme.textSecondary)
                .padding(.horizontal, Space.s4)
                .padding(.vertical, Space.s2)
            if model.changedFiles.isEmpty {
                Text("The run changed nothing in the working copy.")
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
                    .padding(.horizontal, Space.s4)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(model.changedFiles) { file in
                            ChangedFileRow(file: file)
                                .padding(.horizontal, Space.s4)
                                .padding(.vertical, Space.s1)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }

    private var diffPane: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Diff")
                .font(Type.metadataMedium)
                .foregroundStyle(theme.textSecondary)
                .padding(.horizontal, Space.s4)
                .padding(.vertical, Space.s2)
            if let diff = model.diff, !diff.isEmpty {
                ScrollView([.vertical, .horizontal]) {
                    Text(diff)
                        .font(Type.monoSmall)
                        .foregroundStyle(theme.text)
                        .textSelection(.enabled)
                        .padding(.horizontal, Space.s4)
                        .padding(.bottom, Space.s4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                Text("No diff to show. Either the integration was already in the baseline revision, or nothing was written.")
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
                    .padding(.horizontal, Space.s4)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Diff of the working copy")
    }
}
