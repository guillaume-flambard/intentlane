import SwiftUI
import StudioCore

/// Screen two. One question, and a short list of outcomes the project can actually
/// deliver, derived from its own contract. The Apple catalogue is not shown, because
/// the catalogue is not what the user is choosing.
public struct GoalScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel

    public var body: some View {
        ScreenScroll {
            VStack(alignment: .leading, spacing: Space.s6) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    Text("What should this app be able to do?")
                        .font(Type.title)
                        .foregroundStyle(theme.text)
                    Text("\(model.cards.count) journey\(model.cards.count == 1 ? "" : "s") \(model.cards.count == 1 ? "is" : "are") available for \(model.facts?.name ?? "this project"), taken from its contract.")
                        .font(Type.body)
                        .foregroundStyle(theme.textSecondary)
                }

                VStack(spacing: Space.s3) {
                    ForEach(model.cards) { card in
                        GoalCard(
                            card: card,
                            isSelected: model.selectedGoalID == card.id,
                            action: { model.select(card.id) }
                        )
                    }
                }

                if !model.omissions.isEmpty {
                    VStack(alignment: .leading, spacing: Space.s1) {
                        ForEach(model.omissions, id: \.self) { omission in
                            HStack(alignment: .top, spacing: Space.s2) {
                                Image(systemName: "minus.circle")
                                    .font(Type.metadata)
                                    .foregroundStyle(theme.textSecondary)
                                Text(omission)
                                    .font(Type.metadata)
                                    .foregroundStyle(theme.textSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .padding(Space.s3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(theme.paper)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
                }
            }
            .padding(Space.s8)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .safeAreaInset(edge: .bottom) {
            HStack {
                Spacer()
                Button("Continue") { model.buildPlan() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!model.canPlan)
                    .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, Space.s6)
            .padding(.vertical, Space.s4)
            .background(.regularMaterial)
            .overlay(alignment: .top) { Divider() }
        }
    }
}

/// Screen three. The route from the application as it is to the result, with the
/// owner of each step and whether it is ready, asked for permission or not yet
/// known. Nothing here estimates a duration.
public struct PlanScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScreenScroll {
                VStack(alignment: .leading, spacing: Space.s6) {
                    VStack(alignment: .leading, spacing: Space.s2) {
                        Text("The route")
                            .font(Type.title)
                            .foregroundStyle(theme.text)
                        if let goal = model.selectedGoal {
                            Text(goal.outcome)
                                .font(Type.journey)
                                .foregroundStyle(theme.route)
                        }
                    }

                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(model.plan.enumerated()), id: \.element.id) { index, node in
                            PlanRow(
                                node: node,
                                drawn: index < model.plan.count - 1
                            )
                        }
                    }

                    if let preflightHint {
                        Label {
                            Text(preflightHint)
                                .font(Type.metadata)
                                .foregroundStyle(theme.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        } icon: {
                            Image(systemName: "lock.shield")
                                .font(Type.metadata)
                                .foregroundStyle(theme.signal)
                        }
                        .padding(Space.s3)
                        .background(theme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
                    }
                }
                .padding(Space.s8)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .center)
            }

            Divider()
            HStack {
                Button("Back") { model.stage = .goal }
                Spacer()
                Button("Build this integration") { model.execute() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!model.canRun)
                    .keyboardShortcut(.defaultAction)
                    .accessibilityHint("Runs the engine in an isolated worktree at the chosen revision.")
            }
            .padding(.horizontal, Space.s6)
            .padding(.vertical, Space.s4)
        }
    }

    private var preflightHint: String? {
        guard let facts = model.facts else { return nil }
        return "IntentLane will create \(model.worktreePath) from \(facts.branch) at \(facts.revision), and will not write to your own checkout."
    }
}

struct PlanRow: View {
    @Environment(\.intentLaneTheme) private var theme
    let node: PlanNode
    let drawn: Bool

    var body: some View {
        HStack(alignment: .top, spacing: Space.s3) {
            VStack(spacing: 0) {
                Image(systemName: node.readiness.symbol)
                    .font(.system(size: 12))
                    .foregroundStyle(tint)
                    .frame(width: 16, height: 20)
                if drawn {
                    Rectangle().fill(theme.line).frame(width: 2, height: 40)
                }
            }
            .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                    Text(node.title)
                        .font(Type.bodyMedium)
                        .foregroundStyle(theme.text)
                    Text(node.readiness.rawValue)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                }
                Text(node.detail)
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Text("owner: \(node.owner.rawValue)")
                    .font(Type.metadata)
                    .foregroundStyle(theme.textSecondary)
            }
            .padding(.bottom, drawn ? Space.s3 : 0)
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(node.title), \(node.readiness.rawValue), owner \(node.owner.rawValue). \(node.detail)")
    }

    private var tint: Color {
        switch node.readiness {
        case .ready: theme.signal
        case .requiresPermission: theme.warning
        case .unknown: theme.textSecondary
        }
    }
}
