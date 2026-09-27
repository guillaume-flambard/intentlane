import Foundation

/// Who does a step. A step the engine settles is IntentLane's, a step an agent
/// repairs is the agent's, and the two the product refuses to fake are a person's.
public enum StepOwner: String, Sendable, Equatable, CaseIterable {
    case intentLane = "IntentLane"
    case agent = "Agent"
    case appCode = "App code"
    case human = "Human"
}

/// The state of one node on the route. It is drawn, and it is also spelled out in
/// words next to it, because a route that only communicates through colour and
/// geometry is not readable by everyone.
public enum RouteNodeState: Sendable, Equatable {
    case solid
    case active
    case outlined
    case dashed
    case stopped
}

/// One step of the run, named as what it settles rather than as the function that
/// settles it. `prepare` is a baseline build to a person; `analyse` is a mapping.
public struct RouteStepModel: Sendable, Equatable, Identifiable {
    public let id: RunStepID
    public let title: String
    public let owner: StepOwner
    public let status: RunStepStatus
    public let state: RouteNodeState
    public let isCurrent: Bool
    public let detail: String?
    public let diagnostic: String?
    public let evidence: [EvidenceEntry]
    public let durationMs: Int?

    public init(
        id: RunStepID,
        title: String,
        owner: StepOwner,
        status: RunStepStatus,
        state: RouteNodeState,
        isCurrent: Bool,
        detail: String?,
        diagnostic: String?,
        evidence: [EvidenceEntry],
        durationMs: Int?
    ) {
        self.id = id
        self.title = title
        self.owner = owner
        self.status = status
        self.state = state
        self.isCurrent = isCurrent
        self.detail = detail
        self.diagnostic = diagnostic
        self.evidence = evidence
        self.durationMs = durationMs
    }

    /// The wording a person reads beside the node. Status is never carried by colour
    /// alone, so this string is the status.
    public var statusLabel: String {
        switch status {
        case .pass: "Verified"
        case .fail: "Failed"
        case .blocked: "Needs a person"
        case .skipped: "Not part of this journey"
        case .pending: isCurrent ? "Running" : "Not attempted"
        }
    }

    /// The whole route in words, for a screen reader and for anyone who cannot use
    /// the diagram as a diagram.
    public var spokenForm: String {
        var sentence = "\(title): \(statusLabel)"
        if let detail, !detail.isEmpty { sentence += ". \(detail)" }
        return sentence
    }
}

public enum JourneyRoute {
    static let titles: [RunStepID: String] = [
        .prepare: "Baseline build",
        .analyse: "Entity mapping",
        .implement: "Generated integration",
        .test: "Runtime verification",
        .repair: "Repair",
        .demonstrate: "Human check",
        .deliver: "Delivery"
    ]

    static let owners: [RunStepID: StepOwner] = [
        .prepare: .intentLane,
        .analyse: .intentLane,
        .implement: .intentLane,
        .test: .intentLane,
        .repair: .agent,
        .demonstrate: .human,
        .deliver: .human
    ]

    /// The route, derived from the journal the engine wrote. Nothing here is
    /// predicted: a step is a node with a name and the status the engine recorded,
    /// and a step the journal has never mentioned is not attempted.
    public static func derive(journal: RunJournal?, running: Bool = false) -> [RouteStepModel] {
        let current = journal?.nextStep?.id
        return RunStepID.declaredSequence.map { id in
            let step = journal?.step(id)
            let status = step?.status ?? .pending
            let isCurrent = running && current == id
            return RouteStepModel(
                id: id,
                title: titles[id] ?? id.rawValue,
                owner: owners[id] ?? .intentLane,
                status: status,
                state: state(of: status, isCurrent: isCurrent),
                isCurrent: isCurrent,
                detail: step.flatMap(detail(of:)),
                diagnostic: step?.diagnostic,
                evidence: step?.evidence ?? [],
                durationMs: step?.durationMs
            )
        }
    }

    static func state(of status: RunStepStatus, isCurrent: Bool) -> RouteNodeState {
        switch status {
        case .pass: .solid
        case .fail, .blocked: .stopped
        case .skipped: .dashed
        case .pending: isCurrent ? .active : .outlined
        }
    }

    /// What the step actually left behind, in the engine's own words: the artifact
    /// a build produced, or the note the engine wrote about what it found.
    static func detail(of step: RunStep) -> String? {
        if let artifact = step.evidence.compactMap(\.artifact).first { return "\(artifact) built" }
        if let note = step.evidence.compactMap(\.note).first { return firstSentence(note) }
        if let command = step.evidence.compactMap(\.command).first, step.evidence.contains(where: { $0.kind == .command }) {
            return firstSentence(command)
        }
        if let diagnostic = step.diagnostic { return firstSentence(diagnostic) }
        return nil
    }

    /// A diagnostic is written for a terminal, so the route shows its first clause
    /// and the evidence row keeps the whole of it.
    static func firstSentence(_ text: String) -> String {
        let cleaned = text.split(separator: "\n").first.map(String.init) ?? text
        let clause = cleaned.split(whereSeparator: { $0 == "." || $0 == ";" }).first.map(String.init) ?? cleaned
        let trimmed = clause.trimmingCharacters(in: .whitespaces)
        return trimmed.count <= 160 ? trimmed : String(trimmed.prefix(157)) + "..."
    }
}

/// One piece of evidence, collapsed to a subject and a state, expandable to what
/// was observed and which claim it supports.
public struct EvidenceItem: Sendable, Equatable, Identifiable {
    public enum State: Sendable, Equatable {
        case verified
        case humanCheckRequired
        case notPartOfJourney
        case blocked
        case notAttempted

        public var label: String {
            switch self {
            case .verified: "Verified"
            case .humanCheckRequired: "Human check required"
            case .notPartOfJourney: "Not part of this journey"
            case .blocked: "Blocked"
            case .notAttempted: "Not attempted"
            }
        }

        public var symbol: String {
            switch self {
            case .verified: "checkmark.circle.fill"
            case .humanCheckRequired: "circle.dashed"
            case .notPartOfJourney: "minus.circle"
            case .blocked: "exclamationmark.triangle.fill"
            case .notAttempted: "circle"
            }
        }
    }

    public let id: String
    public let subject: String
    public let state: State
    public let observation: String
    public let derivedClaim: String
    public let requiredLayer: String?
    public let source: String?

    public init(
        id: String,
        subject: String,
        state: State,
        observation: String,
        derivedClaim: String,
        requiredLayer: String? = nil,
        source: String? = nil
    ) {
        self.id = id
        self.subject = subject
        self.state = state
        self.observation = observation
        self.derivedClaim = derivedClaim
        self.requiredLayer = requiredLayer
        self.source = source
    }

    /// The evidence a run actually produced, plus the two surfaces this product
    /// never claims on a suite's word. Both halves are named here so the result
    /// screen can say what is missing without a second list.
    public static func derive(journal: RunJournal?, engineVersion: String?) -> [EvidenceItem] {
        var items: [EvidenceItem] = []
        for step in JourneyRoute.derive(journal: journal) {
            guard step.status != .pending, step.status != .skipped else { continue }
            let observation: String
            if let detail = step.detail, !detail.isEmpty {
                observation = detail
            } else if let diagnostic = step.diagnostic {
                observation = JourneyRoute.firstSentence(diagnostic)
            } else {
                observation = "The journal records the step as \(step.status.rawValue)."
            }
            let source = [step.id.rawValue, engineVersion].compactMap { $0 }.joined(separator: " · ")
            items.append(EvidenceItem(
                id: step.id.rawValue,
                subject: step.title,
                state: evidenceState(of: step),
                observation: observation,
                derivedClaim: claim(for: step),
                requiredLayer: layer(for: step, journal: journal),
                source: source.isEmpty ? nil : source
            ))
        }
        return items
    }

    static func evidenceState(of step: RouteStepModel) -> EvidenceItem.State {
        switch step.status {
        case .pass: .verified
        case .fail: .blocked
        case .blocked: .humanCheckRequired
        case .skipped: .notPartOfJourney
        case .pending: .notAttempted
        }
    }

    /// The claim a step supports, in the words of the run sequence rather than the
    /// internals: what it settles, not which function settled it.
    static func claim(for step: RouteStepModel) -> String {
        switch step.id {
        case .prepare: "The application builds on this machine before IntentLane touches it."
        case .analyse: "The contract's seams exist in the application, with a file and a line for each."
        case .implement: "The generated declarations and the adapter are in the target and the target compiles."
        case .test: "The application's own suites pass."
        case .repair: "A failing signature was repaired, within the repair budget."
        case .demonstrate: "A person played the journey in the built application."
        case .deliver: "The claims are settled by evidence rather than by assertion."
        }
    }

    /// The layer a claim needs before a command can settle it. Shown so the reason
    /// for a human check is a missing layer, not a shrug.
    static func layer(for step: RouteStepModel, journal: RunJournal?) -> String? {
        switch step.id {
        case .demonstrate: "macOS 27 with Siri, played by a person"
        case .deliver: "Evidence ledger, human confirmed"
        case .test: "xcodebuild, the application's own suites"
        default: nil
        }
    }
}

/// The three result states, kept apart because they ask different things of the
/// reader: nothing left to do, one thing left that only a person can do, or a
/// reason the run stopped.
public enum JourneyVerdict: Sendable, Equatable {
    case verified
    case humanCheckRequired(reason: String)
    case blocked(reason: String)

    public var headline: String {
        switch self {
        case .verified: "Integration ready"
        case .humanCheckRequired: "Integration built"
        case .blocked: "IntentLane stopped safely"
        }
    }

    /// A failure is a failure. A block whose reason asks for a person is not one, and
    /// calling it one would train the reader to ignore the word. A run that reached
    /// delivery but still has something a person has to confirm is not stopped
    /// either: the work finished and one observation is missing, which is a different
    /// sentence and a different button.
    public static func derive(journal: RunJournal?, unverifiedByAHuman: [String]) -> JourneyVerdict {
        guard let journal else {
            return .blocked(reason: "The run left no journal to read.")
        }
        if let failed = journal.steps.first(where: { $0.status == .fail }) {
            return .blocked(reason: failed.diagnostic ?? "The \(failed.id.rawValue) step failed.")
        }
        if journal.isComplete {
            return unverifiedByAHuman.isEmpty
                ? .verified
                : .humanCheckRequired(reason: unverifiedSentence(unverifiedByAHuman))
        }
        if let blocked = journal.steps.first(where: { $0.status == .blocked }) {
            return .humanCheckRequired(reason: blocked.diagnostic ?? "A step needs a person.")
        }
        if !unverifiedByAHuman.isEmpty {
            return .humanCheckRequired(reason: unverifiedSentence(unverifiedByAHuman))
        }
        return .blocked(reason: journal.blockingDiagnostic ?? "The run did not reach delivery.")
    }

    static func unverifiedSentence(_ items: [String]) -> String {
        let list = items.joined(separator: "; ")
        return "The run settled every step it could, and \(items.count == 1 ? "one thing" : "\(items.count) things") still need a person: \(list)."
    }
}

/// A node of the route the user approves before anything runs. Readiness is a fact
/// about what exists, not an estimate of how long the work will take.
public struct PlanNode: Sendable, Equatable, Identifiable {
    public enum Readiness: String, Sendable, Equatable {
        case ready = "ready"
        case requiresPermission = "requires permission"
        case unknown = "unknown"

        public var symbol: String {
            switch self {
            case .ready: "checkmark"
            case .requiresPermission: "person.crop.circle"
            case .unknown: "questionmark.circle"
            }
        }
    }

    public let id: String
    public let title: String
    public let detail: String
    public let owner: StepOwner
    public let readiness: Readiness

    public init(id: String, title: String, detail: String, owner: StepOwner, readiness: Readiness) {
        self.id = id
        self.title = title
        self.detail = detail
        self.owner = owner
        self.readiness = readiness
    }
}

public enum PlanRoute {
    public static func derive(contract: IntegrationContract?, facts: ProjectFacts?, enginePresent: Bool) -> [PlanNode] {
        let entityCount = contract?.entities.count ?? 0
        let intentCount = contract?.intents.count ?? 0
        let project = facts?.xcodeProject ?? "no Xcode project found at the root"
        return [
            PlanNode(
                id: "existing-app",
                title: "Existing app",
                detail: "\(facts?.name ?? "The project") · \(project) · \(facts?.platform ?? "Apple platform")",
                owner: .appCode,
                readiness: facts?.xcodeProject == nil ? .unknown : .ready
            ),
            PlanNode(
                id: "model-entities",
                title: "Model entities",
                detail: entityCount == 0
                    ? "The contract names no entity to index"
                    : "\(entityCount) entit\(entityCount == 1 ? "y" : "ies") from the contract: \(entityNames(contract))",
                owner: .intentLane,
                readiness: entityCount == 0 ? .unknown : .ready
            ),
            PlanNode(
                id: "generate-integration",
                title: "Generate Apple integration",
                detail: intentCount == 0
                    ? "The contract names no intent"
                    : "\(intentCount) intent\(intentCount == 1 ? "" : "s") generated from the contract",
                owner: .intentLane,
                readiness: enginePresent ? (intentCount == 0 ? .unknown : .ready) : .unknown
            ),
            PlanNode(
                id: "connect-app-data",
                title: "Connect app data",
                detail: "The adapter maps the entity onto the store the app already uses",
                owner: .agent,
                readiness: .unknown
            ),
            PlanNode(
                id: "build",
                title: "Build",
                detail: "xcodebuild build, Debug, with derived data inside the worktree",
                owner: .intentLane,
                readiness: facts?.xcodeProject == nil ? .unknown : .ready
            ),
            PlanNode(
                id: "verify",
                title: "Verify",
                detail: "The application's suites, then a person in Spotlight and Siri",
                owner: .human,
                readiness: .requiresPermission
            )
        ]
    }

    private static func entityNames(_ contract: IntegrationContract?) -> String {
        guard let contract, !contract.entities.isEmpty else { return "none" }
        return contract.entities.map(\.readableName).joined(separator: ", ")
    }
}
