import SwiftUI
import StudioCore

/// Screen four, the signature one. The route advances as the engine settles steps.
/// There is no spinner and no "thinking": the current step is the one the engine is
/// working on, named in the present tense, and everything behind it has collapsed
/// into evidence.
public struct RunScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let facts = model.facts {
                ProjectSafetyStrip(facts: facts, workingCopy: model.worktreePath)
            }

            ScreenScroll {
                VStack(alignment: .leading, spacing: Space.s6) {
                    VStack(alignment: .leading, spacing: Space.s1) {
                        Text(currentTitle)
                            .font(Type.title)
                            .foregroundStyle(theme.text)
                        if let goal = model.selectedGoal {
                            Text(goal.outcome)
                                .font(Type.journey)
                                .foregroundStyle(theme.route)
                        }
                    }

                    RouteView(steps: model.route, showsSpokenSummary: true)

                    if let findings = model.preflight?.findings, !findings.isEmpty {
                        VStack(alignment: .leading, spacing: Space.s1) {
                            ForEach(findings) { finding in
                                Label {
                                    Text(finding.message)
                                        .font(Type.metadata)
                                        .foregroundStyle(theme.textSecondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                } icon: {
                                    Image(systemName: finding.severity == .blocking ? "xmark.octagon" : "exclamationmark.triangle")
                                        .font(Type.metadata)
                                        .foregroundStyle(finding.severity == .blocking ? theme.error : theme.warning)
                                }
                            }
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
                if !model.lastProgressLines.isEmpty {
                    DisclosureGroup {
                        ScreenScroll {
                            VStack(alignment: .leading, spacing: 1) {
                                ForEach(model.lastProgressLines, id: \.self) { line in
                                    Text(line)
                                        .font(Type.monoSmall)
                                        .foregroundStyle(theme.textSecondary)
                                        .textSelection(.enabled)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .frame(maxHeight: 160)
                    } label: {
                        Text("View technical log")
                            .font(Type.action)
                            .foregroundStyle(theme.route)
                    }
                }
                Spacer()
                Button(model.isRunning ? "Stop" : "Running") { model.requestCancel() }
                    .controlSize(.large)
                    .disabled(!model.isRunning)
            }
            .padding(.horizontal, Space.s6)
            .padding(.vertical, Space.s4)
        }
    }

    /// Factual states, in the present tense. The window never says the agent is
    /// thinking, because nothing is thinking: a command is running. A run that has
    /// already stopped is described by what stopped it, not by a state that says it
    /// is about to begin.
    private var currentTitle: String {
        if !model.isRunning {
            if let blocked = model.route.first(where: { $0.state == .stopped }) {
                return "Stopped at \(blocked.title.lowercased())"
            }
            if model.route.allSatisfy({ $0.status == .pass }) {
                return "The route is complete"
            }
            return "Ready to build"
        }
        let current = model.route.first { $0.isCurrent }
        guard let current else { return "Running" }
        switch current.id {
        case .prepare: return "Inspecting repository and building the baseline"
        case .analyse: return "Mapping the contract onto the application"
        case .implement: return "Generating the integration and the adapter"
        case .test: return "Running runtime verification"
        case .repair: return "Repairing the failing signature"
        case .demonstrate: return "Waiting for a person to play the journey"
        case .deliver: return "Settling the claims by evidence"
        }
    }
}

/// Screen five. Three outcomes, kept apart. A verified run, a run whose automated
/// evidence is complete and whose last observation needs a person, and a run that
/// stopped with a reason.
public struct ResultScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let facts = model.facts {
                ProjectSafetyStrip(facts: facts, workingCopy: model.worktreePath, original: model.userRepositoryVerdict)
            }
            Divider()

            ScreenScroll {
                VStack(alignment: .leading, spacing: Space.s8) {
                    ResultSummary(verdict: model.verdict, reason: reason)

                    if !model.evidence.isEmpty {
                        section("What was verified") {
                            VStack(alignment: .leading, spacing: Space.s1) {
                                ForEach(model.evidence) { EvidenceRow(item: $0) }
                            }
                        }
                    }

                    if !model.changedFiles.isEmpty {
                        section("What changed") {
                            VStack(alignment: .leading, spacing: Space.s1) {
                                ForEach(model.changedFiles) { file in
                                    ChangedFileRow(file: file)
                                }
                            }
                        }
                    }

                    if !model.evidence.isEmpty && !model.changedFiles.isEmpty {
                        section("Known limits") {
                            VStack(alignment: .leading, spacing: Space.s1) {
                                ForEach(model.report?.unverifiedByAHuman ?? [], id: \.self) { item in
                                    HStack(alignment: .top, spacing: Space.s2) {
                                        Image(systemName: "person.crop.circle.badge.clock")
                                            .font(Type.metadata)
                                            .foregroundStyle(theme.warning)
                                        Text(item)
                                            .font(Type.metadata)
                                            .foregroundStyle(theme.textSecondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(Space.s8)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .center)
            }

            Divider()
            HStack {
                Button("Start another") { model.restart() }
                Spacer()
                switch model.verdict {
                case .humanCheckRequired:
                    Button("Run final check") { model.stage = .run }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    Button("Review changes") { model.reviewingChanges = true }
                        .controlSize(.large)
                case .verified:
                    Button("Review changes") { model.reviewingChanges = true }
                        .controlSize(.large)
                    Button("Prepare delivery") {}
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                case .blocked:
                    Button("Review changes") { model.reviewingChanges = true }
                        .controlSize(.large)
                    Button("Inspect the log") {}
                        .controlSize(.large)
                }
            }
            .padding(.horizontal, Space.s6)
            .padding(.vertical, Space.s4)
        }
    }

    private var reason: String {
        switch model.verdict {
        case .verified: "Every step of the journey passed the evidence it required."
        case .humanCheckRequired(let why): why
        case .blocked(let why): why
        }
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text(title)
                .font(Type.metadataMedium)
                .foregroundStyle(theme.textSecondary)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ResultSummary: View {
    @Environment(\.intentLaneTheme) private var theme
    let verdict: JourneyVerdict
    let reason: String

    var body: some View {
        HStack(alignment: .top, spacing: Space.s4) {
            Image(systemName: symbol)
                .font(.system(size: 26))
                .foregroundStyle(tint)
            VStack(alignment: .leading, spacing: Space.s2) {
                Text(verdict.headline)
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                    .fixedSize(horizontal: false, vertical: true)
                Text(reason)
                    .font(Type.body)
                    .foregroundStyle(theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: Radius.surface, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(verdict.headline). \(reason)")
    }

    private var symbol: String {
        switch verdict {
        case .verified: "checkmark.seal.fill"
        case .humanCheckRequired: "person.crop.circle.badge.clock"
        case .blocked: "hand.raised.fill"
        }
    }

    private var tint: Color {
        switch verdict {
        case .verified: theme.signal
        case .humanCheckRequired: theme.warning
        case .blocked: theme.error
        }
    }
}

struct ChangedFileRow: View {
    @Environment(\.intentLaneTheme) private var theme
    let file: DiffReader.ChangedFile

    var body: some View {
        HStack(spacing: Space.s2) {
            Image(systemName: file.origin.symbol)
                .font(Type.metadata)
                .foregroundStyle(theme.route)
                .frame(width: 16)
            Text(file.path)
                .font(Type.monoSmall)
                .foregroundStyle(theme.text)
                .lineLimit(1)
                .truncationMode(.middle)
            Spacer(minLength: 0)
            Text(file.origin.rawValue)
                .font(Type.metadata)
                .foregroundStyle(theme.textSecondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(file.path), \(file.origin.rawValue), \(file.change.rawValue)")
    }
}
