import SwiftUI
import StudioCore

/// The capability map. Ten groups, one tree, and nothing presented that the audit
/// did not classify: the state a row carries is the engine's own word for what the
/// repository showed, and a group the catalogue does not name lands in `other`
/// rather than silently disappearing.
///
/// The screen answers one question, *what can Apple already do with this
/// application, and what is next*, and it answers it from the report the engine
/// produced. Selecting a node opens the original findings row beside it, and the
/// score above the tree is the engine's own figure carried verbatim rather than a
/// gauge this window recolours.
public struct CapabilitiesScreen: View {
    @Environment(\.intentLaneTheme) private var theme
    @Bindable var model: StudioModel
    /// Drive from a real audit the model has already collected, so nothing is
    /// invented here. When there is none the screen states that instead of
    /// drawing a fixture.
    @State private var filter: CapabilityFilter = .all
    @State private var selection: String?
    private let opener = EvidenceOpener()

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let facts = model.facts {
                ProjectSafetyStrip(facts: facts, workingCopy: model.worktreePath)
            }

            switch model.capabilityScreen {
            case .empty(let reason):
                emptyState(reason)
            case .reading:
                readingState
            case .tree(let tree):
                treeState(tree)
            }

            Divider()
            footer
        }
    }

    private func emptyState(_ reason: String) -> some View {
        ScreenScroll {
            VStack(alignment: .leading, spacing: Space.s3) {
                Text("No audit yet")
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                Text(reason)
                    .font(Type.body)
                    .foregroundStyle(theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: 520, alignment: .leading)

                if model.canReadCapabilityAudit {
                    Button("Read the map") { model.openCapabilities() }
                        .buttonStyle(.borderedProminent)
                }
            }
            .padding(Space.s8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }

    private var readingState: some View {
        ScreenScroll {
            VStack(alignment: .leading, spacing: Space.s3) {
                Text("Reading the engine's report")
                    .font(Type.title)
                    .foregroundStyle(theme.text)
                Text("The audit is read-only. Nothing in your checkout is changed while this runs.")
                    .font(Type.body)
                    .foregroundStyle(theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: 520, alignment: .leading)
            }
            .padding(Space.s8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }

    private func treeState(_ tree: CapabilityTree) -> some View {
        let shown = filter.apply(to: tree)
        return ScreenScroll {
            VStack(alignment: .leading, spacing: Space.s8) {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("Capability map")
                        .font(Type.title)
                        .foregroundStyle(theme.text)
                    if let score = tree.score {
                        Text("\(score.score) / 100, \(score.band), \(score.discovery) discovery")
                            .font(Type.journey)
                            .foregroundStyle(theme.route)
                    }
                    if let catalogue = tree.catalogue {
                        Text("Catalogue \(catalogue)")
                            .font(Type.metadata)
                            .foregroundStyle(theme.textSecondary)
                    }
                }

                StateTotals(tree: tree)
                filterRow

                if shown.groups.isEmpty {
                    Text("No finding in this report has that state.")
                        .font(Type.body)
                        .foregroundStyle(theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    ForEach(shown.groups) { bucket in
                        VStack(alignment: .leading, spacing: Space.s2) {
                            Text(bucket.id)
                                .font(Type.journey)
                                .foregroundStyle(theme.route)
                                .textCase(.uppercase)
                            ForEach(Array(bucket.nodes.enumerated()), id: \.offset) { _, node in
                                CapabilityRow(
                                    node: node,
                                    isSelected: selection == key(node),
                                    action: { select(node) }
                                )
                                if selection == key(node), let node = inspectorNode(in: shown) {
                                    Inspector(node: node, opener: opener, worktree: model.worktreeURL)
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
    }

    private var filterRow: some View {
        Picker("Filter", selection: $filter) {
            ForEach(CapabilityFilter.allCases, id: \.self) { one in
                Text(one.rawValue).tag(one)
            }
        }
        .pickerStyle(.segmented)
        .labelsHidden()
        .accessibilityLabel("Filter findings by state")
    }

    private var footer: some View {
        HStack {
            Spacer()
            Button("Back to project") { model.stage = .project }
                .controlSize(.large)
        }
        .padding(.horizontal, Space.s6)
        .padding(.vertical, Space.s4)
    }

    // MARK: Selection

    /// Two findings can share a capability id when they differ by platform, so the
    /// selection carries both and the row it lands on is the row that was clicked.
    private func key(_ node: CapabilityNode) -> String {
        "\(node.platform ?? "")::\(node.id)"
    }

    private func select(_ node: CapabilityNode) {
        let next = key(node)
        selection = selection == next ? nil : next
    }

    private func inspectorNode(in tree: CapabilityTree) -> CapabilityNode? {
        guard let selection else { return nil }
        return tree.groups.flatMap(\.nodes).first { key($0) == selection }
    }
}

/// One line of the map: the engine's state, the capability id, and where the
/// report says the proof is. No glyph is invented and no row is summarised, so
/// the line a reader sees is the line the report wrote.
struct CapabilityRow: View {
    @Environment(\.intentLaneTheme) private var theme
    let node: CapabilityNode
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text(node.state)
                    .font(Type.metadata)
                    .foregroundStyle(isSelected ? theme.route : theme.textSecondary)
                    .frame(width: 88, alignment: .leading)
                    .textCase(.uppercase)

                Text(node.id)
                    .font(Type.body)
                    .foregroundStyle(theme.text)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(evidenceLine)
                    .font(Type.metadata)
                    .foregroundStyle(hasEvidence ? theme.route : theme.warning)
                    .truncationMode(.middle)
                    .frame(width: 220, alignment: .trailing)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.vertical, Space.s1)
        .padding(.horizontal, isSelected ? Space.s2 : 0)
        .background(isSelected ? theme.routeSoft : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
        .accessibilityLabel("\(node.id), \(node.state), \(evidenceLine)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var hasEvidence: Bool { node.evidence.contains { $0.path != nil } }

    private var evidenceLine: String {
        guard let evidence = node.evidence.first, let path = evidence.path else {
            return "no evidence path"
        }
        return evidence.line.map { "\(path):\($0)" } ?? path
    }
}

/// The original findings row, opened beside the capability it belongs to. Every
/// field the report carried is here, verbatim: this is the record, not a summary
/// of the record, and the gaps are all shown because a gap the window hides is a
/// gap the reader cannot plan around.
struct Inspector: View {
    @Environment(\.intentLaneTheme) private var theme
    let node: CapabilityNode
    let opener: EvidenceOpener
    let worktree: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Text("Findings row")
                .font(Type.metadataMedium)
                .foregroundStyle(theme.textSecondary)
                .textCase(.uppercase)

            field("Capability", node.id)
            field("State", node.state)
            field("Confidence", node.confidence)
            if let platform = node.platform {
                field("Platform", platform)
            }

            if !node.dependencies.isEmpty {
                field("Requirements", node.dependencies.joined(separator: ", "))
            }

            if !node.gaps.isEmpty {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("Gaps")
                        .font(Type.metadataMedium)
                        .foregroundStyle(theme.textSecondary)
                    ForEach(Array(node.gaps.enumerated()), id: \.offset) { _, gap in
                        Text("\(gap.code): \(gap.message)")
                            .font(Type.monoSmall)
                            .foregroundStyle(theme.text)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            if !node.evidence.isEmpty {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("Evidence")
                        .font(Type.metadataMedium)
                        .foregroundStyle(theme.textSecondary)
                    ForEach(Array(node.evidence.enumerated()), id: \.offset) { _, evidence in
                        evidenceRow(evidence)
                    }
                }
            }

            if !node.nextAction.isEmpty {
                field("Next action", node.nextAction)
            }
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Findings row for \(node.id)")
    }

    private func field(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
            Text(label)
                .font(Type.metadata)
                .foregroundStyle(theme.textSecondary)
                .frame(width: 110, alignment: .leading)
            Text(value)
                .font(Type.monoSmall)
                .foregroundStyle(theme.text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func evidenceRow(_ evidence: AuditEvidenceMirror) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
            Text(evidence.kind)
                .font(Type.metadata)
                .foregroundStyle(theme.textSecondary)
                .frame(width: 70, alignment: .leading)
            Text(location(evidence))
                .font(Type.monoSmall)
                .foregroundStyle(theme.text)
                .truncationMode(.middle)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let worktree, let path = evidence.path, opener.canOpen(path: path, in: worktree) {
                Button("Open in Xcode") {
                    opener.open(path: path, line: evidence.line, in: worktree)
                }
                .font(Type.action)
                .controlSize(.small)
            }
        }
    }

    private func location(_ evidence: AuditEvidenceMirror) -> String {
        guard let path = evidence.path else { return "no path named" }
        return evidence.line.map { "\(path):\($0)" } ?? path
    }
}

/// The count of every state the engine can produce, including the ones this report
/// has none of. A column at zero is information about the project; a column that is
/// missing is a question the reader was never allowed to ask.
struct StateTotals: View {
    @Environment(\.intentLaneTheme) private var theme
    let tree: CapabilityTree

    private var totals: [String: Int] {
        let nodes = tree.groups.flatMap(\.nodes)
        return Dictionary(grouping: nodes, by: \.state).mapValues(\.count)
    }

    var body: some View {
        HStack(alignment: .top, spacing: Space.s6) {
            ForEach(CapabilityMapper.states, id: \.self) { state in
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("\(totals[state] ?? 0)")
                        .font(Type.title)
                        .foregroundStyle(theme.text)
                    Text(state)
                        .font(Type.metadata)
                        .foregroundStyle(theme.textSecondary)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            CapabilityMapper.states.map { "\($0): \(totals[$0] ?? 0)" }.joined(separator: ", ")
        )
    }
}
