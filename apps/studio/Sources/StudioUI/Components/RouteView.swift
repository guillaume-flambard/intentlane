import SwiftUI
import StudioCore

/// The route, which is the product's one drawing. A thin line joins the steps, the
/// part that has happened is solid, the part that has not is an outline, and a block
/// leaves a gap where the line stopped. It is an explanation of progress, not a
/// canvas to rearrange.
public struct RouteView: View {
    @Environment(\.intentLaneTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let steps: [RouteStepModel]
    private let showsSpokenSummary: Bool

    public init(steps: [RouteStepModel], showsSpokenSummary: Bool = false) {
        self.steps = steps
        self.showsSpokenSummary = showsSpokenSummary
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                RouteRow(
                    step: step,
                    isFirst: index == 0,
                    isLast: index == steps.count - 1,
                    lineAbove: RouteView.line(for: index, steps: steps),
                    lineBelow: RouteView.line(for: index + 1, steps: steps)
                )
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Route, \(steps.count) steps")
    }

    /// A line is drawn only where the run actually went through: between two
    /// settled steps it is solid, under a step nobody reached it is absent, and a
    /// block above it leaves the gap that says the route stopped here.
    static func line(for index: Int, steps: [RouteStepModel]) -> Bool {
        guard index > 0 else { return false }
        let above = steps[index - 1]
        return above.state == .solid || above.state == .active
    }
}

struct RouteRow: View {
    @Environment(\.intentLaneTheme) private var theme

    let step: RouteStepModel
    let isFirst: Bool
    let isLast: Bool
    let lineAbove: Bool
    let lineBelow: Bool

    private var nodeColor: Color {
        switch step.state {
        case .solid: theme.signal
        case .active: theme.route
        case .stopped: step.status == .blocked ? theme.warning : theme.error
        case .outlined, .dashed: theme.textSecondary
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: Space.s3) {
            routeColumn
                .frame(maxHeight: .infinity)
            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                    Text(step.title)
                        .font(step.isCurrent ? Type.journey : Type.bodyMedium)
                        .foregroundStyle(theme.text)
                    if step.isCurrent {
                        StatusMark(.running, emphasis: .strong)
                    }
                }
                if let detail = step.detail, !detail.isEmpty {
                    Text(detail)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: Space.s2) {
                    Text(step.statusLabel)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                    Text("·")
                        .font(Type.metadata)
                        .foregroundStyle(theme.line)
                    Text(step.owner.rawValue)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                    if let duration = step.durationMs {
                        Text("·")
                            .font(Type.metadata)
                            .foregroundStyle(theme.line)
                        Text(StepRow.duration(duration))
                            .font(Type.monoSmall)
                            .foregroundStyle(theme.textSecondary)
                    }
                }
            }
            .padding(.bottom, isLast ? 0 : Space.s4)
            Spacer(minLength: 0)
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(step.spokenForm)
    }

    private var routeColumn: some View {
        // The line runs the full height of the row so the route reads as one
        // connected path rather than a column of marks. Above a node it is drawn
        // only when the step before it was reached; below it only when this step was.
        // A step the run stopped at keeps a coloured stub, so the halt is visible
        // instead of the line just ending.
        ZStack(alignment: .top) {
            Rectangle()
                .fill(theme.line)
                .frame(width: 2)
                .frame(maxHeight: .infinity)
                .opacity(lineAbove ? 1 : 0)
            Rectangle()
                .fill(nodeColor)
                .frame(width: 2, height: 8)
                .offset(y: 20)
                .opacity(lineBelow ? 1 : 0)
            Rectangle()
                .fill(nodeColor)
                .frame(width: 2, height: 8)
                .offset(y: 20)
                .opacity(step.state == .stopped ? 1 : 0)
            node
        }
        .frame(width: 16)
        .frame(maxHeight: .infinity)
    }

    private var node: some View {
        ZStack {
            switch step.state {
            case .solid, .stopped:
                Circle().fill(nodeColor).frame(width: 10, height: 10)
            case .active:
                Circle()
                    .stroke(nodeColor, lineWidth: 2)
                    .frame(width: 10, height: 10)
            case .outlined:
                Circle()
                    .stroke(theme.textSecondary.opacity(0.7), lineWidth: 1.5)
                    .frame(width: 10, height: 10)
            case .dashed:
                Circle()
                    .stroke(theme.textSecondary.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [2, 2]))
                    .frame(width: 10, height: 10)
            }
        }
        .frame(height: 18)
    }

    private func segment(height: CGFloat, drawn: Bool) -> some View {
        Group {
            if drawn {
                Rectangle()
                    .fill(theme.line)
                    .frame(width: 2, height: height)
            } else {
                Color.clear.frame(width: 2, height: height)
            }
        }
    }
}
enum StepRow {
    static func duration(_ ms: Int) -> String {
        ms < 1000 ? "\(ms)ms" : String(format: "%.1fs", Double(ms) / 1000)
    }
}
