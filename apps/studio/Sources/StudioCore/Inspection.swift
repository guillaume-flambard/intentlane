import Foundation
import StudioCore

/// The five stages of one journey, in the order the reader lives them. A project, a
/// goal, a route to approve, the work, and what came out. There is no dashboard
/// before the project and no settings after the result.
public enum StudioStage: Int, CaseIterable, Sendable, Equatable {
    case project
    case goal
    case plan
    case run
    case result

    public var label: String {
        switch self {
        case .project: "Project"
        case .goal: "Goal"
        case .plan: "Plan"
        case .run: "Work"
        case .result: "Result"
        }
    }
}

/// What the window knows, gathered from reads only. Nothing here executes the
/// project's own build scripts; the first command that does belongs to `run`.
public struct ProjectInspection: Sendable, Equatable {
    public let facts: ProjectFacts
    public let contract: IntegrationContract?
    public let cards: [StudioCore.GoalCard]
    public let omissions: [String]
    public let engineAvailable: Bool
    public let contractProblem: String?

    public init(
        facts: ProjectFacts,
        contract: IntegrationContract?,
        cards: [StudioCore.GoalCard],
        omissions: [String],
        engineAvailable: Bool,
        contractProblem: String?
    ) {
        self.facts = facts
        self.contract = contract
        self.cards = cards
        self.omissions = omissions
        self.engineAvailable = engineAvailable
        self.contractProblem = contractProblem
    }

    /// What stands between this project and a run, in the reader's words, or an empty
    /// string when nothing does. The project screen shows exactly this, so the gate
    /// on the Continue button and the sentence beside it can never disagree.
    public func canBeTransformedHint() -> String {
        if let contractProblem { return contractProblem }
        if facts.revision.isEmpty { return "This directory is not a git repository with a commit." }
        if !engineAvailable { return "The IntentLane engine is not installed in this build." }
        if cards.isEmpty { return "The contract names no intent, so there is nothing to build." }
        return ""
    }
}

public enum Inspector {
    public static let contractFileName = "contract.yaml"

    /// Reads a project and its contract, and says plainly which of the two is
    /// missing. A project with no contract is not a project IntentLane can transform
    /// yet, and hiding that behind an empty card list would waste the user's time.
    public static func inspect(repository: URL, engine: URL) -> ProjectInspection {
        let contract = ContractLocator.locate(in: repository, engine: engine)
        let parsed: IntegrationContract?
        var problem: String?
        switch contract {
        case .none:
            parsed = nil
            problem = "No \(contractFileName) was found. IntentLane needs a pilot contract to know which seams to build."
        case .some(let url):
            do {
                parsed = try ContractReader.read(url)
            } catch {
                parsed = nil
                problem = "The contract at \(url.lastPathComponent) could not be read: \(error)"
            }
        }

        let facts = ProjectReader.read(repository: repository, contract: parsed)
            ?? ProjectFacts(
                name: repository.lastPathComponent,
                repositoryPath: repository.path,
                branch: "",
                revision: "",
                xcodeProject: nil,
                minimumMacOS: nil,
                uncommitted: []
            )

        return ProjectInspection(
            facts: facts,
            contract: parsed,
            cards: parsed.map { GoalCards.derive(from: $0) } ?? [],
            omissions: parsed.map { GoalCards.omissions(from: $0) } ?? [],
            engineAvailable: FileManager.default.isExecutableFile(atPath: engine.path),
            contractProblem: problem
        )
    }
}

/// Where a pilot contract comes from.
///
/// The engine looks for `pilots/<id>/contract.yaml` next to its own working
/// directory, and the application ships one inside its own bundle. A repository
/// that carries its own takes precedence, because that is the version the run will
/// actually be judged against.
///
/// The bundle is searched by walking up from this binary rather than by trusting
/// `Bundle.main`: the shipped contract has to be found when the code runs inside a
/// test bundle, inside the application, or as a plain executable, and `Bundle.main`
/// is the application in two of those and something else in the third.
public enum ContractLocator {
    public static func locate(in repository: URL, engine: URL) -> URL? {
        let candidates = [
            repository.appendingPathComponent(Inspector.contractFileName),
            repository.appendingPathComponent("pilots/fsnotes/\(Inspector.contractFileName)")
        ]
        if let found = candidates.first(where: { FileManager.default.fileExists(atPath: $0.path) }) {
            return found
        }
        return shipped()
    }

    /// The contract the application ships, found by walking up from a known root
    /// until a `pilots` directory appears. Walking is what makes the lookup
    /// independent of where the code sits: inside `IntentLaneStudio.app/Contents`, in
    /// a test bundle, or in a build directory, the distance differs every time.
    ///
    /// `INTENTLANE_STUDIO_PILOTS` names the directory outright when a caller knows
    /// it, which is how a test points at the checkout it is running in.
    public static func shipped() -> URL? {
        let pilot = "pilots/fsnotes/\(Inspector.contractFileName)"

        if let declared = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_PILOTS"] {
            let candidate = URL(fileURLWithPath: declared).appendingPathComponent("fsnotes/\(Inspector.contractFileName)")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        }

        var roots: [URL] = []
        if let executable = Bundle.main.executableURL { roots.append(executable.deletingLastPathComponent()) }
        roots.append(Bundle.main.bundleURL)

        for root in roots {
            var directory = root
            for _ in 0..<8 {
                let candidate = directory.appendingPathComponent(pilot)
                if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
                directory = directory.deletingLastPathComponent()
            }
        }
        return nil
    }
}
