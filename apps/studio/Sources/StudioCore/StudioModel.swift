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
    /// The run directory's own `audit.json` wins when the run already wrote one,
    /// because a report on disk is a report a person can point at. The engine is
    /// asked only when there is none.
    public func openCapabilities() {
        stage = .capabilities
        guard audit == nil, !isAuditing else { return }

        if let existing = RealAuditReader.read(repositoryPath: ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"]) {
            audit = existing
            return
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
        }
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
        audit: AuditReportMirror? = nil
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
