import SwiftUI
import StudioCore

/// A status, stated. The word and the glyph carry the meaning and the colour only
/// reinforces it, so the interface survives a colour-blind reader, a monochrome
/// display and a screenshot printed in black and white.
public struct StatusMark: View {
    @Environment(\.intentLaneTheme) private var theme

    public enum Kind {
        case verified
        case running
        case needsPerson
        case blocked
        case notAttempted
        case notPartOfJourney

        public var label: String {
            switch self {
            case .verified: "Verified"
            case .running: "Running"
            case .needsPerson: "Human check required"
            case .blocked: "Blocked"
            case .notAttempted: "Not attempted"
            case .notPartOfJourney: "Not part of this journey"
            }
        }

        public var symbol: String {
            switch self {
            case .verified: "checkmark.circle.fill"
            case .running: "arrow.triangle.2.circlepath"
            case .needsPerson: "person.crop.circle.badge.clock"
            case .blocked: "exclamationmark.triangle.fill"
            case .notAttempted: "circle.dashed"
            case .notPartOfJourney: "minus.circle"
            }
        }
    }

    private let kind: Kind
    private let emphasis: Emphasis

    public enum Emphasis { case quiet, plain, strong }

    public init(_ kind: Kind, emphasis: Emphasis = .plain) {
        self.kind = kind
        self.emphasis = emphasis
    }

    public var body: some View {
        HStack(spacing: Space.s1 + 2) {
            Image(systemName: kind.symbol)
                .font(Type.metadataMedium)
                .foregroundStyle(tint)
                .symbolEffect(.pulse, isActive: kind == .running)
            Text(kind.label)
                .font(emphasis == .strong ? Type.bodyMedium : Type.metadata)
                .foregroundStyle(kind == .running ? theme.text : theme.textSecondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(kind.label)
    }

    private var tint: Color {
        switch kind {
        case .verified: theme.signal
        case .running: theme.route
        case .needsPerson: theme.warning
        case .blocked: theme.error
        case .notAttempted, .notPartOfJourney: theme.textSecondary
        }
    }
}

/// Where IntentLane is working, said once and kept on screen for the whole run. The
/// reader's first fear is that their own checkout is about to change, so the strip
/// answers that with the branch, the revision, the working copy and a measured
/// answer about the original.
public struct ProjectSafetyStrip: View {
    @Environment(\.intentLaneTheme) private var theme

    private let facts: ProjectFacts
    private let workingCopy: String
    private let original: DiffReader.Unchanged?

    public init(facts: ProjectFacts, workingCopy: String, original: DiffReader.Unchanged? = nil) {
        self.facts = facts
        self.workingCopy = workingCopy
        self.original = original
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s4) {
            VStack(alignment: .leading, spacing: 2) {
                Text(facts.name)
                    .font(Type.bodyMedium)
                    .foregroundStyle(theme.text)
                Text("\(facts.branch) @ \(facts.revision)")
                    .font(Type.monoSmall)
                    .foregroundStyle(theme.textSecondary)
                    .textSelection(.enabled)
            }

            Divider().frame(height: 26)

            VStack(alignment: .leading, spacing: 2) {
                Text("Working copy")
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
                Text(workingCopy)
                    .font(Type.monoSmall)
                    .foregroundStyle(theme.route)
                    .textSelection(.enabled)
            }

            Spacer(minLength: Space.s2)

            if facts.hasUncommittedChanges {
                HStack(spacing: Space.s1 + 2) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(Type.metadata)
                        .foregroundStyle(theme.warning)
                    Text("Your checkout has uncommitted changes. IntentLane will not modify it.")
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: 320, alignment: .trailing)
            } else if let original {
                switch original {
                case .untouched:
                    Label {
                        Text("Original checkout: untouched")
                            .font(Type.metadata)
                            .foregroundStyle(theme.textSecondary)
                    } icon: {
                        Image(systemName: "lock.shield")
                            .font(Type.metadata)
                            .foregroundStyle(theme.signal)
                    }
                case .changed(let what):
                    Label {
                        Text("Original checkout changed: \(what)")
                            .font(Type.metadata)
                            .foregroundStyle(theme.error)
                    } icon: {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(Type.metadata)
                            .foregroundStyle(theme.error)
                    }
                }
            }
        }
        .padding(.horizontal, Space.s6)
        .padding(.vertical, Space.s3)
        .background(theme.surface)
        .overlay(alignment: .bottom) {
            Rectangle().fill(theme.line).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(safetySentence)
    }

    private var safetySentence: String {
        var sentence = "\(facts.name), \(facts.branch) at \(facts.revision). IntentLane works in \(workingCopy)."
        if facts.hasUncommittedChanges {
            sentence += " Your checkout has uncommitted changes, and IntentLane will not modify it."
        } else if let original {
            switch original {
            case .untouched: sentence += " Your own checkout is untouched."
            case .changed(let what): sentence += " Your own checkout changed: \(what)."
            }
        }
        return sentence
    }
}
