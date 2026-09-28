import Foundation
import StudioCore

/// What the window is showing, and what it has read to show it. The engine is still
/// the only thing that runs a transformation: this holds the route, the journal it
/// wrote, the diff it produced, and the two questions the reader keeps asking, which
/// project is this and is my own checkout safe.
@Observable
@MainActor
public final class StudioModel {
    /// The stage the window is on. It moves forward when the reader approves something
    /// and backward when they go back, so it is settable from the views that own those
    /// transitions rather than only from the model.
    public var stage: StudioStage = .project
    public internal(set) var inspection: ProjectInspection?
    public internal(set) var selectedGoalID: String?
    public internal(set) var report: RunReport?
    public internal(set) var progressLines: [RunProgress] = []
    public internal(set) var isRunning = false
    public internal(set) var userRepositoryVerdict: DiffReader.Unchanged?
    public internal(set) var plan: [PlanNode] = []

    public var repository: URL?
    public var preflight: Preflight?
    public var userRepositoryBefore: DiffReader.RepositoryState?
    /// Whether the change review is open over the result. It is a temporary surface,
    /// dismissed by the same action that opened it, and it never becomes a section of
    /// the product.
    public var reviewingChanges = false

    public let cancellation = Cancellation()

    public init() {}

    /// The capability tree the Capabilities screen renders, derived from an audit
    /// that has already been collected. This window presents it; it never calls
    /// the engine to build the tree itself, because the mapping is a pure
    /// function shared with the TypeScript side.
    public internal(set) var audit: AuditReportMirror?
    /// Whether an audit is being read right now, so the screen can say it is
    /// waiting instead of explaining an absence that has not finished happening.
    public internal(set) var isAuditing = false

    public var capabilityTree: CapabilityTree? {
        audit.map(CapabilityMapper.map)
    }

    /// What the Capabilities screen renders, decided here once so the screen and
    /// its tests cannot disagree about why a tree is absent. An absence is always
    /// stated: a screen that shows nothing looks like a project with nothing in it.
    public var capabilityScreen: CapabilityScreenMode {
        if let tree = capabilityTree { return .tree(tree) }
        if isAuditing { return .reading }
        return .empty(capabilityEmptyReason)
    }

    /// Why there is no tree. The first condition that holds is the one shown, and
    /// each is a fact about this model rather than a guess about the machine.
    public var capabilityEmptyReason: String {
        if facts == nil { return "Choose a project first: the map is derived from that project's own audit." }
        if !engineAvailable { return "The engine is not available on this machine, so there is no report to map." }
        if scope() == nil { return "The isolated worktree does not exist yet. Run the journey once, then read its capability map." }
        return "No report came back from the engine. Read the map again to retry."
    }

    /// Whether asking for an audit can do anything at all right now. The screen
    /// shows its button only under this condition, so a control that does nothing
    /// is never offered.
    public var canReadCapabilityAudit: Bool {
        scope() != nil && engineAvailable
    }

    /// Opens the capability map and reads the audit it renders. The audit is
    /// read-only: nothing is transformed, and a report the model already holds is
    /// never read a second time.
    ///
    /// Freshness is asked before presence. A report on disk is used only when its
    /// own provenance matches the worktree that is there now; a report that does
    /// not match is discarded and the engine is asked again, because a complete
    /// document describing a commit that is no longer checked out is exactly the
    /// stale-and-plausible failure this screen must not show.
    public func openCapabilities() {
        stage = .capabilities
        guard audit == nil, !isAuditing else { return }

        switch RealAuditReader.read(
            repositoryPath: ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"],
            currentRevision: facts?.revision
        ) {
        case .fresh(let report):
            audit = report
            return
        case .stale(let reason):
            // Stated before the work starts, so the reader sees why the map is
            // being rebuilt rather than watching it appear unexplained.
            auditProblem = reason
        case .absent:
            break
        }

        guard let scope = scope(), engineAvailable else { return }
        isAuditing = true
        let executor = AuditExecutor()
        Task { @MainActor in
            let report = await Task.detached(priority: .userInitiated) {
                executor.runAudit(scope: scope).report
            }.value
            self.audit = report
            self.isAuditing = false
            if report == nil { self.auditProblem = Self.auditReadFailure }
        }
    }

    /// Why the map could not be shown, when the reason is not the absence of an
    /// audit. Stated rather than swallowed, and cleared as soon as a report
    /// arrives.
    public internal(set) var auditProblem: String?

    private static let auditReadFailure =
        "The engine did not return a report, so there is nothing to map."

    // MARK: Deliverable

    /// What the window shows of the deliverable. It is a string and a state,
    /// deliberately: a richer type would be a document this window composed.
    public internal(set) var deliverable: DeliverableDisplay = .absent

    /// The engine's document, verbatim, and nil when there is none. Nothing in
    /// this file formats it, wraps it, or re-indents it.
    public var deliverableText: String? {
        if case .ready(let text) = deliverable { return text }
        return nil
    }

    /// The engine runner the deliverable is read through. Injectable so a test can
    /// assert the command and the text without launching anything.
    public var deliverableRunner: DeliverableExecutor.Runner?

    /// Asks the engine to render the deliverable for the report this project was
    /// audited into, and keeps exactly what it printed.
    ///
    /// The window is a reader here. A person running the same command on the same
    /// report gets the same document, and a test compares the two, so the window
    /// cannot drift into composing a second one.
    public func readDeliverable() {
        // No project means no report to render from. A state that was placed
        // deliberately, by a fixture, is left alone rather than replaced by an
        // absence the window had no way to learn: "there is nothing to read" and
        // "there is nothing to show" are different facts, and only the engine can
        // settle the second one.
        guard let reportPath else { return }
        // The engine URL is read here, on the actor, and then handed over as a
        // plain value: a `@Sendable` runner cannot reach back into main-actor state,
        // and it should not have to.
        let engine = Self.engineURL
        let runner = deliverableRunner ?? { arguments in
            DeliverableExecutor(engine: engine).launch(arguments)
        }
        switch DeliverableExecutor(engine: engine, run: runner).render(reportPath: reportPath) {
        case .success(let text):
            deliverable = .ready(text)
        case .failure(let failure):
            deliverable = .failed(failure.reason)
        }
    }

    /// The report the deliverable is rendered from: the one this project was
    /// audited into, in the run directory the audit writes.
    public var reportPath: String? {
        guard let repository else { return nil }
        return repository
            .appendingPathComponent(".worktrees/studio/.intentlane/run/audit.json")
            .path
    }

    /// Places the model in a state without running anything, so a screen can be drawn
    /// for a journal that already exists. It never fabricates a verdict: the verdict
    /// is still derived from the journal it is handed.
    public func applyFixture(
        stage: StudioStage,
        inspection: ProjectInspection?,
        selectedGoalID: String? = nil,
        plan: [PlanNode]? = nil,
        journal: RunJournal? = nil,
        report: RunReport? = nil,
        audit: AuditReportMirror? = nil,
        deliverable: DeliverableDisplay = .absent
    ) {
        self.inspection = inspection
        self.selectedGoalID = selectedGoalID
        self.plan = plan ?? []
        if let report {
            self.report = report
        } else if let journal {
            self.report = RunReport(
                outcome: .finished(exitCode: 0),
                progress: [],
                toolObservations: [],
                journal: journal,
                diff: nil,
                unverifiedByAHuman: ["the demonstrated journey"]
            )
        }
        self.audit = audit
        self.auditProblem = nil
        // A fixture places a document the engine already rendered, so a screen can
        // be drawn for a state that exists. It is the same string the window would
        // have read, never one this app composed: a fixture cannot invent a
        // deliverable any more than it can invent an audit.
        self.deliverable = deliverable
        self.stage = stage
    }

    // MARK: Project

    public var facts: ProjectFacts? { inspection?.facts }
    public var cards: [StudioCore.GoalCard] { inspection?.cards ?? [] }
    public var omissions: [String] { inspection?.omissions ?? [] }
    public var contractProblem: String? { inspection?.contractProblem }
    public var engineAvailable: Bool { inspection?.engineAvailable ?? false }

    /// Why the journey cannot start, or an empty string when it can. The screen shows
    /// this beside the disabled control, so the two cannot disagree.
    public var blockingHint: String { inspection?.canBeTransformedHint() ?? "Choose a project to begin." }

    public var isDirty: Bool { facts?.hasUncommittedChanges ?? false }
    public var canContinueToGoal: Bool {
        facts?.revision.isEmpty == false && cards.isEmpty == false && contractProblem == nil
    }

    public var worktreePath: String {
        guard let repository else { return ".worktrees/studio" }
        return repository.appendingPathComponent(".worktrees/studio").lastPathComponent
    }

    /// The worktree as a URL, for evidence paths the report wrote relative to it.
    public var worktreeURL: URL? {
        repository?.appendingPathComponent(".worktrees/studio")
    }

    public func inspect(_ repository: URL) {
        self.repository = repository
        inspection = Inspector.inspect(repository: repository, engine: Self.engineURL)
        userRepositoryVerdict = nil
        report = nil
        progressLines = []
        stage = .project
    }

    public func advanceToGoal() {
        guard canContinueToGoal else { return }
        stage = .goal
    }

    // MARK: Goal

    public func select(_ goalID: String) {
        selectedGoalID = goalID
    }

    public var selectedGoal: StudioCore.GoalCard? {
        cards.first { $0.id == selectedGoalID }
    }

    public var canPlan: Bool { selectedGoal != nil }

    // MARK: Plan

    public func buildPlan() {
        plan = PlanRoute.derive(
            contract: inspection?.contract,
            facts: facts,
            enginePresent: engineAvailable
        )
        stage = .plan
    }

    public var canRun: Bool {
        guard facts?.revision.isEmpty == false else { return false }
        return engineAvailable
    }

    // MARK: Run

    /// The scope a run would execute under. The working directory is the isolated
    /// worktree, and it is named before anything runs so the preflight has something
    /// real to check.
    public func scope() -> RunScope? {
        guard let repository, let facts, !facts.revision.isEmpty else { return nil }
        return RunScope(
            repository: repository,
            commit: facts.revision,
            branch: facts.branch,
            workingDirectory: repository.appendingPathComponent(".worktrees/studio"),
            contract: contractURL(),
            engine: Self.engineURL,
            provider: .localEngine,
            sendsCodeToModel: false
        )
    }

    /// Preflight answers what would run, where it writes, and whether the working
    /// directory is the isolated one. It reads the worktree's own revision, so it can
    /// only be built once that worktree exists, which is why it belongs here and not
    /// on the plan screen.
    public func buildPreflight() {
        guard let resolved = scope() else { return }
        preflight = PreflightBuilder.build(scope: resolved)
    }

    public func requestCancel() { cancellation.request() }

    public func note(_ line: RunProgress) { progressLines.append(line) }

    public func finish(_ report: RunReport) {
        self.report = report
        isRunning = false
        stage = .result
    }

    // MARK: Result

    public var verdict: JourneyVerdict {
        JourneyVerdict.derive(
            journal: report?.journal,
            unverifiedByAHuman: report?.unverifiedByAHuman ?? []
        )
    }

    public var route: [RouteStepModel] {
        JourneyRoute.derive(journal: report?.journal, running: isRunning)
    }

    public var evidence: [EvidenceItem] {
        EvidenceItem.derive(
            journal: report?.journal,
            engineVersion: preflight?.engineVersion
        )
    }

    public var changedFiles: [DiffReader.ChangedFile] {
        guard let repository else { return [] }
        return DiffReader.changedFiles(worktree: repository.appendingPathComponent(".worktrees/studio"))
    }

    public var diff: String? { report?.diff }

    public func restart() {
        stage = .project
        report = nil
        progressLines = []
        preflight = nil
        userRepositoryVerdict = nil
    }

    static var engineURL: URL {
        Bundle.main.resourceURL?.appendingPathComponent("engine/run")
            ?? URL(fileURLWithPath: "/missing")
    }

    private func contractURL() -> URL? {
        guard let repository else { return nil }
        return ContractLocator.locate(in: repository, engine: Self.engineURL)
    }
}
