import Foundation
import Testing
@testable import StudioCore

/// The fixtures below are the contract and journal this repository actually ships.
/// A route that is only ever rendered against a hand-written sample proves that the
/// sample renders, not that the product does.
enum RealPilot {
    /// `<repo>/pilots/fsnotes/contract.yaml`, found from this file rather than from
    /// a hardcoded home directory, so the test travels with the checkout.
    static var contractURL: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("pilots/fsnotes/contract.yaml")
    }

    /// The journal of the real FSNotes run. `nil` means this machine has not run it
    /// and the tests that need it are not asked anything. A journal that was claimed
    /// and cannot be read is an error, not a skip: a run that was pointed at and
    /// cannot be found has not happened.
    static func runJournalOrFail() throws -> RunJournal? {
        guard let repository = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"] else { return nil }
        let path = URL(fileURLWithPath: repository)
            .appendingPathComponent(".worktrees/studio/.intentlane/run/journal.json")
        return try JournalReader.read(Data(contentsOf: path))
    }
}

@Suite("the contract is read as the application's own words")
struct ContractReaderTests {
    @Test("the shipped FSNotes contract names the app, its entities and its intents")
    func readsTheShippedContract() throws {
        let contract = try ContractReader.read(RealPilot.contractURL)
        #expect(contract.name == "FSNotes")
        #expect(contract.identifier == "dev.memolabs.intentlane.fsnotes-pilot")
        #expect(contract.minimumMacOS == "10.14")
        #expect(contract.entities.map(\.id) == ["notebook"])
        #expect(contract.entities.first?.readableName == "Notebook")
        #expect(contract.intents.map(\.id) == ["open_notebook", "search_notebooks"])
        #expect(contract.intents[0].title == "Open notebook")
        #expect(contract.intents[0].schema == "system.open")
        #expect(contract.intents[0].target == "notebook")
        #expect(contract.intents[1].schema == "system.searchInApp")
        #expect(contract.intents[1].summary == "Search notebooks in FSNotes")
    }

    @Test("a document that names no application is refused rather than half read")
    func refusesAnApplicationlessDocument() {
        #expect(ContractReader.parse("entities:\n  - id: notebook\n") == nil)
    }
}

@Suite("a journey is offered as an outcome, not as an Apple framework")
struct GoalCardTests {
    @Test("the two intents of the shipped contract become two user outcomes")
    func derivesOutcomesFromTheContract() throws {
        let cards = GoalCards.derive(from: try ContractReader.read(RealPilot.contractURL))
        #expect(cards.count == 2)
        #expect(cards[0].outcome == "Open one notebook from Spotlight")
        #expect(cards[1].outcome == "Search notebooks inside the app")
    }

    @Test("the technical names travel with the card, in the disclosure")
    func carriesTheTechnicalNames() throws {
        let card = GoalCards.derive(from: try ContractReader.read(RealPilot.contractURL))[0]
        #expect(card.pieces.map(\.role) == ["IndexedEntity", "AppIntent", "AppSchema"])
        #expect(card.pieces.map(\.name) == ["notebook", "open_notebook", "system.open"])
    }

    @Test("a card says that a person confirms the runtime, because no suite can")
    func isHonestAboutTheRuntimeCheck() throws {
        let card = GoalCards.derive(from: try ContractReader.read(RealPilot.contractURL))[0]
        #expect(card.runtimeCheck.contains("person"))
    }

    @Test("what the contract leaves out is said, so the list is not read as a promise")
    func namesTheOmissions() throws {
        let omissions = GoalCards.omissions(from: try ContractReader.read(RealPilot.contractURL))
        #expect(omissions.contains { $0.contains("created, renamed or deleted") })
        #expect(omissions.contains { $0.contains("Notebook") })
    }
}

@Suite("the route is the engine's own steps, named as outcomes")
struct JourneyRouteTests {
    @Test("every step of the sequence is a node, including the two that need a person")
    func coversTheWholeSequence() {
        let steps = JourneyRoute.derive(journal: nil)
        #expect(steps.count == RunStepID.declaredSequence.count)
        #expect(steps.map(\.title) == [
            "Baseline build", "Entity mapping", "Generated integration", "Runtime verification",
            "Repair", "Human check", "Delivery"
        ])
        #expect(steps.filter { $0.owner == .human }.map(\.id) == [.demonstrate, .deliver])
        #expect(steps.first { $0.id == .repair }?.owner == .agent)
    }

    @Test("a step the journal never mentions is not attempted, not failed")
    func pendingIsNotFailure() {
        let steps = JourneyRoute.derive(journal: nil)
        #expect(steps.allSatisfy { $0.status == .pending })
        #expect(steps.allSatisfy { $0.state == .outlined })
        #expect(steps.allSatisfy { $0.statusLabel == "Not attempted" })
    }

    @Test("the real run shows four settled steps and the rest untouched")
    func readsTheRealRun() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let steps = JourneyRoute.derive(journal: journal)
        let byID = Dictionary(uniqueKeysWithValues: steps.map { ($0.id, $0) })
        #expect(byID[.prepare]?.status == .pass)
        #expect(byID[.prepare]?.state == .solid)
        #expect(byID[.analyse]?.status == .pass)
        #expect(byID[.implement]?.status == .pass)
        #expect(byID[.test]?.status == .blocked)
        #expect(byID[.test]?.state == .stopped)
        #expect(byID[.deliver]?.status == .pending)
    }

    @Test("a baseline build reports the artifact it produced")
    func namesTheArtifactOfABuild() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let prepare = JourneyRoute.derive(journal: journal).first { $0.id == .prepare }
        #expect(prepare?.detail == "FSNotes.app built")
    }

    @Test("the mapping step reports the seams the engine found, in its words")
    func namesWhatMappingFound() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let analyse = JourneyRoute.derive(journal: journal).first { $0.id == .analyse }
        #expect(analyse?.detail?.contains("notebook") == true)
    }

    @Test("a long diagnostic shows its first clause on the route and keeps the rest")
    func shortensTheDiagnostic() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let test = JourneyRoute.derive(journal: journal).first { $0.id == .test }
        let detail = try #require(test?.detail)
        #expect(detail.count <= 160)
        #expect(journal.blockingDiagnostic?.count ?? 0 > detail.count)
    }

    @Test("every node has a sentence, so the diagram is not the only way to read it")
    func everyNodeSpeaks() {
        for step in JourneyRoute.derive(journal: nil) {
            #expect(step.spokenForm.hasPrefix(step.title))
            #expect(step.statusLabel.isEmpty == false)
        }
    }
}

@Suite("a result is one of three things, and it says which")
struct JourneyVerdictTests {
    @Test("the real run is a human check, not a failure")
    func theRealRunNeedsAPerson() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let verdict = JourneyVerdict.derive(journal: journal, unverifiedByAHuman: ["the demonstrated journey"])
        guard case .humanCheckRequired(let reason) = verdict else {
            Issue.record("A blocked step that asks for a person is not a stopped run: got \(verdict)")
            return
        }
        #expect(reason.contains("observed the application"))
        #expect(verdict.headline == "Integration built")
    }

    @Test("a run that settled everything with nothing left for a person is ready")
    func completeIsReady() {
        let journal = TestJournals.complete()
        let verdict = JourneyVerdict.derive(journal: journal, unverifiedByAHuman: [])
        #expect(verdict == .verified)
        #expect(verdict.headline == "Integration ready")
    }

    @Test("a run that completed but still needs a person is not called ready, and not called stopped")
    func completeWithAHumanLeftIsNotReady() {
        let journal = TestJournals.complete()
        let verdict = JourneyVerdict.derive(journal: journal, unverifiedByAHuman: ["the demonstrated journey"])
        guard case .humanCheckRequired(let reason) = verdict else {
            Issue.record("A complete run with a person left is state B, not a stop: got \(verdict)")
            return
        }
        #expect(reason.contains("the demonstrated journey"))
        #expect(verdict.headline == "Integration built")
    }

    @Test("a failed step stops the run and is reported as stopped")
    func failureStops() {
        let journal = TestJournals.failing(at: .test)
        guard case .blocked(let reason) = JourneyVerdict.derive(journal: journal, unverifiedByAHuman: []) else {
            Issue.record("A failed step must stop the run.")
            return
        }
        #expect(reason == "The suite did not pass")
        #expect(JourneyVerdict.derive(journal: journal, unverifiedByAHuman: []).headline == "IntentLane stopped safely")
    }

    @Test("no journal is a stop, not a silence")
    func noJournalStops() {
        guard case .blocked = JourneyVerdict.derive(journal: nil, unverifiedByAHuman: []) else {
            Issue.record("A run with no journal cannot be called anything else.")
            return
        }
    }
}

@Suite("the approved route states what is ready and what is not")
struct PlanRouteTests {
    @Test("a project with a contract and an engine has four ready nodes")
    func derivesReadiness() throws {
        let contract = try ContractReader.read(RealPilot.contractURL)
        let facts = ProjectFacts(
            name: "FSNotes", repositoryPath: "/tmp/fsnotes", branch: "main", revision: "11b11e529722",
            xcodeProject: "FSNotes.xcodeproj", minimumMacOS: "10.14", uncommitted: []
        )
        let nodes = PlanRoute.derive(contract: contract, facts: facts, enginePresent: true)
        #expect(nodes.count == 6)
        #expect(nodes.map(\.readiness) == [.ready, .ready, .ready, .unknown, .ready, .requiresPermission])
        #expect(nodes[1].detail.contains("Notebook"))
        #expect(nodes[3].readiness == .unknown)
        #expect(nodes[5].owner == .human)
    }

    @Test("a repository with no Xcode project is unknown, not ready")
    func noProjectIsUnknown() {
        let facts = ProjectFacts(
            name: "Whatever", repositoryPath: "/tmp/x", branch: "main", revision: "abcdef123456",
            xcodeProject: nil, minimumMacOS: nil, uncommitted: []
        )
        let nodes = PlanRoute.derive(contract: nil, facts: facts, enginePresent: false)
        #expect(nodes[0].readiness == .unknown)
        #expect(nodes[2].readiness == .unknown)
    }
}

@Suite("a contract is found, or its absence is explained")
struct ContractLocatorTests {
    @Test("a repository that carries its own contract wins over the shipped one")
    func repositoryContractWins() throws {
        let directory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("intentlane-locator-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let local = directory.appendingPathComponent(Inspector.contractFileName)
        // A contract keeps the application's name under `app:`, which is where the
        // parser reads it from.
        try "app:\n  name: Local\n".write(to: local, atomically: true, encoding: .utf8)

        let found = try #require(
            ContractLocator.locate(in: directory, engine: URL(fileURLWithPath: "/missing"))
        )
        #expect(found == local)
        #expect(ContractReader.parse(try String(contentsOf: found, encoding: .utf8))?.name == "Local")
    }

    @Test("a project with no contract is inspected into a reason, not an empty screen")
    func missingContractIsExplained() throws {
        let directory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("intentlane-empty-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let inspection = Inspector.inspect(repository: directory, engine: URL(fileURLWithPath: "/missing"))
        // Either a contract was found by walking up, or the reason is stated. What
        // must never happen is an inspection that offers no journey and no reason.
        if inspection.cards.isEmpty {
            #expect(inspection.contractProblem?.isEmpty == false, "an empty journey list has to be explained")
        }
        #expect(inspection.canBeTransformedHint().isEmpty == false || inspection.cards.isEmpty == false)
    }

    @Test("the shipped pilots directory is found when one is declared")
    func declaredPilotsAreUsed() throws {
        // Without a declared directory there is nothing to declare it about, so
        // this is skipped rather than failed: a missing environment variable is
        // not a defect in the locator.
        guard let declared = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_PILOTS"] else {
            return
        }
        #expect(declared.isEmpty == false)
        #expect(ContractLocator.shipped() != nil, "the declared pilots directory must hold the contract")
    }
}

@Suite("evidence is a subject and a state before it is a ledger")
struct EvidenceItemTests {
    @Test("the real run produces evidence only for the steps it settled")
    func onlySettledStepsProduceEvidence() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        let items = EvidenceItem.derive(journal: journal, engineVersion: "0.1.0")
        #expect(items.map(\.id) == ["prepare", "analyse", "implement", "test"])
        #expect(items[0].state == .verified)
        #expect(items[3].state == .humanCheckRequired)
        #expect(items[0].source == "prepare · 0.1.0")
    }

    @Test("every item carries a claim, because an observation without a claim is trivia")
    func everyItemHasAClaim() throws {
        guard let journal = try RealPilot.runJournalOrFail() else { return }
        for item in EvidenceItem.derive(journal: journal, engineVersion: nil) {
            #expect(item.derivedClaim.isEmpty == false)
            #expect(item.observation.isEmpty == false)
        }
    }

    @Test("the two human steps name the layer a command cannot reach")
    func humanStepsNameTheirLayer() {
        let steps = JourneyRoute.derive(journal: nil)
        #expect(steps.filter { $0.owner == .human }.count == 2)
        let layers = EvidenceItem.derive(journal: TestJournals.complete(), engineVersion: nil)
            .filter { $0.requiredLayer != nil }
        #expect(layers.map(\.subject) == ["Runtime verification", "Human check", "Delivery"])
        #expect(layers.first { $0.subject == "Human check" }?.requiredLayer?.contains("Siri") == true)
    }
}

/// Journals built only to reach a state the real run cannot reach yet, used by the
/// layout tests rather than by anything the window shows as evidence.
enum TestJournals {
    static func journal(_ steps: [(RunStepID, RunStepStatus, String?)]) throws -> RunJournal {
        let data = try JSONSerialization.data(withJSONObject: [
            "schema": "pilot-run/1.0",
            "pilot": "fsnotes",
            "branch": "intentlane/pilot-notebook",
            "commit": "11b11e529722",
            "steps": steps.map { id, status, diagnostic -> [String: Any] in
                var step: [String: Any] = [
                    "id": id.rawValue,
                    "status": status.rawValue,
                    "commit": "11b11e529722",
                    "attempts": 1,
                    "evidence": status == .pending ? [] : [["kind": "command", "note": "fixture"]]
                ]
                if let diagnostic { step["diagnostic"] = diagnostic }
                return step
            }
        ])
        return try JournalReader.read(data)
    }

    static func complete() -> RunJournal {
        try! journal(RunStepID.declaredSequence.map { ($0, RunStepStatus.pass, Optional<String>.none) })
    }

    static func failing(at id: RunStepID) -> RunJournal {
        try! journal(RunStepID.declaredSequence.map { step in
            step == id ? (step, .fail, "The suite did not pass") : (step, .pass, Optional<String>.none)
        })
    }
}
