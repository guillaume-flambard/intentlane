import SwiftUI
import StudioCore

/// One thing the app could do. The headline is an outcome in the user's words. The
/// Apple types sit behind a disclosure, because the user is choosing a capability
/// and not a framework, and a developer who wants the seam can open it.
public struct GoalCard: View {
    @Environment(\.intentLaneTheme) private var theme
    @State private var showsHowItWorks = false

    private let card: StudioCore.GoalCard
    private let isSelected: Bool
    private let action: () -> Void

    public init(card: StudioCore.GoalCard, isSelected: Bool, action: @escaping () -> Void) {
        self.card = card
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Button(action: action) {
                HStack(alignment: .top, spacing: Space.s3) {
                    Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                        .font(.system(size: 18))
                        .foregroundStyle(isSelected ? theme.route : theme.line)
                    VStack(alignment: .leading, spacing: Space.s1) {
                        Text(card.outcome)
                            .font(Type.journey)
                            .foregroundStyle(theme.text)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(card.summary)
                            .font(Type.body)
                            .foregroundStyle(theme.textSecondary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(isSelected ? "Selected. " : "")\(card.outcome). \(card.summary)")
            .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)

            DisclosureGroup(isExpanded: $showsHowItWorks) {
                VStack(alignment: .leading, spacing: Space.s1) {
                    ForEach(card.pieces) { piece in
                        HStack(spacing: Space.s2) {
                            Text(piece.role)
                                .font(Type.monoSmall)
                                .foregroundStyle(theme.textSecondary)
                            Text(piece.name)
                                .font(Type.monoSmall)
                                .foregroundStyle(theme.text)
                            Spacer(minLength: 0)
                        }
                    }
                    Text(card.runtimeCheck)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, Space.s1)
                }
                .padding(.top, Space.s2)
            } label: {
                Text("How this works")
                    .font(Type.action)
                    .foregroundStyle(theme.route)
            }
        }
        .padding(Space.s4)
        .background(theme.surface)
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(isSelected ? theme.route : theme.line, lineWidth: isSelected ? 1.5 : 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }
}

/// One piece of evidence, collapsed to a subject and a state. Expanded it shows the
/// observation, the claim that observation supports, and the layer it needed, which
/// is where the evidence ledger stops and the product begins.
public struct EvidenceRow: View {
    @Environment(\.intentLaneTheme) private var theme
    @State private var isExpanded = false

    private let item: EvidenceItem

    public init(item: EvidenceItem) {
        self.item = item
    }

    private var kind: StatusMark.Kind {
        switch item.state {
        case .verified: .verified
        case .humanCheckRequired: .needsPerson
        case .blocked: .blocked
        case .notPartOfJourney: .notPartOfJourney
        case .notAttempted: .notAttempted
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Image(systemName: item.state.symbol)
                    .font(Type.metadata)
                    .foregroundStyle(tint)
                    .frame(width: 14)
                Text(item.subject)
                    .font(Type.bodyMedium)
                    .foregroundStyle(theme.text)
                StatusMark(kind)
                Spacer(minLength: 0)
                if item.requiredLayer != nil || item.source != nil {
                    Button {
                        isExpanded.toggle()
                    } label: {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(Type.metadata)
                            .foregroundStyle(theme.route)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(isExpanded ? "Hide details of \(item.subject)" : "Show details of \(item.subject)")
                }
            }

            Text(item.observation)
                .font(Type.metadata)
                .foregroundStyle(theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if isExpanded {
                VStack(alignment: .leading, spacing: Space.s1) {
                    detail("Observation", item.observation)
                    detail("Derived claim", item.derivedClaim)
                    if let layer = item.requiredLayer { detail("Required layer", layer) }
                    if let source = item.source { detail("Source", source) }
                }
                .padding(Space.s2)
                .background(theme.paper)
                .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            }
        }
        .padding(.vertical, Space.s1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.subject). \(item.state.label). \(item.observation)")
    }

    private func detail(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: Space.s2) {
            Text(label)
                .font(Type.monoSmall)
                .foregroundStyle(theme.textSecondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(Type.monoSmall)
                .foregroundStyle(theme.text)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
    }

    private var tint: Color {
        switch item.state {
        case .verified: theme.signal
        case .humanCheckRequired: theme.warning
        case .blocked: theme.error
        case .notPartOfJourney, .notAttempted: theme.textSecondary
        }
    }
}
