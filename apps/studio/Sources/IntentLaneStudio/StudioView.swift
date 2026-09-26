import SwiftUI
import StudioCore

struct StudioView: View {
    @State private var model = StudioModel()

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            content
            Divider()
            footer
        }
        .frame(minWidth: 900, minHeight: 620)
    }

    private var header: some View {
        HStack {
            Text("IntentLane Studio")
                .font(.headline)
            Spacer()
            Text(stateLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    private var stateLabel: String {
        switch model.state {
        case .choose: "1 · Project and result"
        case .running: "2 · Running"
        case .result: "3 · Result and proofs"
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .choose: chooseView
        case .running: runningView
        case .result: resultView
        }
    }

    // MARK: State one, the project and the result wanted

    private var chooseView: some View {
        Form {
            Section("Project") {
                HStack {
                    Text(model.repository?.path ?? "No project chosen")
                        .font(.callout)
                        .foregroundStyle(model.repository == nil ? .secondary : .primary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Spacer()
                    Button("Choose…") { chooseRepository() }
                }
                if model.repository != nil {
                    LabeledContent("Branch", value: model.branch)
                    LabeledContent("Revision", value: model.revision)
                }
            }

            Section("Integration") {
                if let integration = model.integration {
                    Text(integration.summary)
                        .font(.callout)
                    Text("Claims the engine will settle: \(integration.claims.joined(separator: ", "))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("No integration loaded.").foregroundStyle(.secondary)
                }
            }

            Section {
                Button("Prepare the run") { model.prepare() }
                    .disabled(!model.canRun)
            } footer: {
                Text("Preparing shows what the run would do. Nothing executes until you approve it.")
            }
        }
        .formStyle(.grouped)
    }

    // MARK: State two, the run and its progress

    private var runningView: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let preflight = model.preflight {
                scopeDisclosure(preflight)
            }
            HStack {
                Button("Run") { model.execute() }
                    .disabled(model.preflight?.isRunnable != true)
                Button("Cancel") { model.requestCancel() }
                    .disabled(!model.isRunning)
            }
            if !model.progressLines.isEmpty {
                List(model.progressLines.suffix(200), id: \.at) { line in
                    Text(line.line).font(.caption.monospaced())
                }
                .frame(minHeight: 220)
            }
        }
        .padding(20)
    }

    /// The three things a run must show before it happens: what executes, where
    /// it writes, and whether anything leaves the machine.
    private func scopeDisclosure(_ preflight: Preflight) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            LabeledContent("Engine", value: preflight.engineVersion ?? "missing")
            LabeledContent("Provider", value: preflight.scope.provider.label)
            LabeledContent("Writes inside the worktree only", value: preflight.writesInsideWorkingDirectoryOnly ? "yes" : "no")
            LabeledContent("Sends code to a model", value: preflight.scope.sendsCodeToModel ? "yes" : "no")
            ForEach(preflight.findings) { finding in
                Label(finding.message, systemImage: finding.severity == .blocking ? "xmark.octagon" : "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(finding.severity == .blocking ? .red : .orange)
            }
        }
        .font(.callout)
    }

    // MARK: State three, the result and its proofs

    private var resultView: some View {
        VStack(alignment: .leading, spacing: 0) {
            headline
            Divider()
            HSplitView {
                VStack(alignment: .leading) {
                    Text("Journal").font(.subheadline.bold())
                    journalList
                    Spacer()
                }
                .padding(16)
                .frame(minWidth: 280)

                VStack(alignment: .leading) {
                    Text("Changed files").font(.subheadline.bold())
                    if let diff = model.report?.diff {
                        ScrollView { Text(diff).font(.caption.monospaced()).textSelection(.enabled) }
                    } else {
                        Text("The run changed nothing.").foregroundStyle(.secondary)
                    }
                }
                .padding(16)
            }
            Divider()
            footerDetail
        }
    }

    private var headline: some View {
        HStack {
            switch model.report?.headline {
            case .integrated:
                Label("Integrated", systemImage: "checkmark.seal.fill").foregroundStyle(.green)
            case .prepared:
                Label("Intégration préparée, vérification restante", systemImage: "exclamationmark.shield").foregroundStyle(.orange)
            case .stopped(let reason):
                Label(reason, systemImage: "stop.circle").foregroundStyle(.red)
            case nil:
                Text("No run yet.").foregroundStyle(.secondary)
            }
            Spacer()
            if let verdict = model.userRepositoryVerdict {
                switch verdict {
                case .untouched:
                    Label("Your repository is unchanged", systemImage: "lock.shield").font(.caption).foregroundStyle(.green)
                case .changed(let what):
                    Label(what, systemImage: "exclamationmark.triangle").font(.caption).foregroundStyle(.red)
                }
            }
        }
        .padding(16)
    }

    private var journalList: some View {
        List {
            ForEach(RunStepID.declaredSequence, id: \.self) { id in
                let step = model.report?.journal?.step(id)
                HStack {
                    Image(systemName: symbol(for: step?.status))
                    Text(id.rawValue)
                    Spacer()
                    if let step {
                        Text("\(step.status.rawValue) · \(step.attempts) attempt\(step.attempts == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .frame(minHeight: 200)
    }

    private func symbol(for status: RunStepStatus?) -> String {
        switch status {
        case .pass: "checkmark.circle.fill"
        case .fail: "xmark.circle.fill"
        case .blocked: "hand.raised.fill"
        case .skipped: "minus.circle"
        case .pending: "circle"
        case nil: "circle.dashed"
        }
    }

    private var footerDetail: some View {
        VStack(alignment: .leading, spacing: 4) {
            DisclosureGroup("Tool observations (\(model.observations.count))") {
                ScrollView {
                    VStack(alignment: .leading) {
                        ForEach(model.observations.suffix(80), id: \.self) { Text($0).font(.caption.monospaced()) }
                    }
                }
                .frame(maxHeight: 140)
            }
            .font(.caption)
        }
        .padding(16)
    }

    private var footer: some View {
        HStack {
            Text("IntentLane does not merge into your branch, and does not push.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            if model.state == .result {
                Button("Start another") { model.state = .choose }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
    }

    private func chooseRepository() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.message = "Choose the application repository IntentLane will work in a worktree."
        if panel.runModal() == .OK, let url = panel.url {
            model.repository = url
            model.inspect()
        }
    }
}
