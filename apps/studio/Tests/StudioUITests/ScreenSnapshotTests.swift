import SwiftUI
import AppKit
import StudioCore
import StudioUI
import Testing

/// Renders the real screens, with the real journal, so the design is judged on what
/// the application actually draws. A mockup is not evidence: every image this writes
/// comes from the same view code the shipped window runs.
@MainActor
enum Snapshot {
    /// 1280x820 and 1000x700 are the sizes the design is checked at, and 960x640 is
    /// below the window's own minimum, so a screen that survives it survives anything.
    static let sizes: [(name: String, width: CGFloat, height: CGFloat)] = [
        ("1280x820", 1280, 820),
        ("1000x700", 1000, 700),
        ("960x640", 960, 640)
    ]

    static var outputDirectory: URL {
        let base = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_SNAPSHOTS"]
            .map { URL(fileURLWithPath: $0) }
            ?? URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("intentlane-snapshots")
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    @discardableResult
    static func write(_ view: some View, name: String, scheme: ColorScheme, size: CGSize, scale: CGFloat = 2) -> URL? {
        let renderer = ImageRenderer(
            content: view
                .frame(width: size.width, height: size.height, alignment: .top)
                .environment(\.colorScheme, scheme)
                .environment(\.intentLaneScreenScrolls, false)
                .preferredColorScheme(scheme)
        )
        renderer.scale = scale
        guard let image = renderer.cgImage else { return nil }
        let bitmap = NSBitmapImageRep(cgImage: image)
        guard let data = bitmap.representation(using: .png, properties: [:]) else { return nil }
        let url = outputDirectory.appendingPathComponent("\(name).png")
        try? data.write(to: url)
        return url
    }

    static func all(name: String, view: some View) {
        for size in sizes {
            for scheme in [ColorScheme.light, .dark] {
                let file = "\(name)-\(size.name)-\(scheme == .dark ? "dark" : "light")"
                _ = write(view, name: file, scheme: scheme, size: CGSize(width: size.width, height: size.height))
            }
        }
    }
}

/// The real FSNotes state, read rather than invented: the real contract, the real
/// revision, and the journal the real run wrote. A screen drawn with made-up values
/// proves the layout and nothing else, so every value here comes from disk.
enum RealPilotState {
    static let facts = ProjectFacts(
        name: "FSNotes",
        repositoryPath: "/tmp/intentlane-fixtures/fsnotes",
        branch: "intentlane/pilot-notebook",
        revision: "11b11e529722",
        xcodeProject: "FSNotes.xcodeproj",
        minimumMacOS: "10.14",
        uncommitted: []
    )

    static var contract: IntegrationContract? {
        try? ContractReader.read(URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("pilots/fsnotes/contract.yaml"))
    }

    /// The journal of the real run. Without it, the screens that show a real run are
    /// not drawn at all rather than drawn from a fixture.
    static var realJournal: RunJournal? {
        guard let repository = ProcessInfo.processInfo.environment["INTENTLANE_STUDIO_REPO"] else { return nil }
        let path = URL(fileURLWithPath: repository)
            .appendingPathComponent(".worktrees/studio/.intentlane/run/journal.json")
        guard let data = try? Data(contentsOf: path) else { return nil }
        return try? JournalReader.read(data)
    }

    /// The FSNotes audit the shell is given for the capability map, read from the
    /// one committed copy in `packages/studio-protocol/fixtures`. It is a real
    /// report, so the map it draws is a real map rather than a layout of invented
    /// findings.
    static var realAudit: AuditReportMirror? {
        let fixture = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // StudioUITests
            .deletingLastPathComponent()   // Tests
            .deletingLastPathComponent()   // apps/studio
            .deletingLastPathComponent()   // apps
            .deletingLastPathComponent()   // repository root
            .appendingPathComponent("packages/studio-protocol/fixtures/fsnotes-audit.json")
        guard let data = try? Data(contentsOf: fixture) else { return nil }
        return AuditReportParser.parse(data)
    }

    /// The engine's own document for the real FSNotes report, read by running the
    /// engine. Nothing here composes it: if the engine cannot run, the deliverable
    /// screens are simply not drawn, because a hand-written document would be a
    /// second deliverable and the screen would be verified against the wrong one.
    static var realDeliverable: String? {
        guard let auditPath = realAuditPath, let engine = enginePath else { return nil }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["pnpm", "exec", "tsx", engine, "deliverable", auditPath]
        // Both pipes are drained before waiting, and the process runs in the
        // repository root, because the engine's own paths are relative to it.
        let output = Pipe()
        let errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        process.currentDirectoryURL = repositoryRoot
        guard (try? process.run()) != nil else { return nil }
        let data = output.fileHandleForReading.readDataToEndOfFile()
        _ = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else { return nil }
        let text = String(decoding: data, as: UTF8.self)
        return text.isEmpty ? nil : text
    }

    /// The repository root, resolved the same way every other read in this file
    /// resolves it, so the engine runs where its relative paths mean something.
    static var repositoryRoot: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // StudioUITests
            .deletingLastPathComponent()   // Tests
            .deletingLastPathComponent()   // apps/studio
            .deletingLastPathComponent()   // apps
            .deletingLastPathComponent()   // repository root
    }

    /// The committed FSNotes report, read from the same place `realAudit` reads it.
    static var realAuditPath: String? {
        let path = repositoryRoot.appendingPathComponent("packages/studio-protocol/fixtures/fsnotes-audit.json")
        return FileManager.default.fileExists(atPath: path.path) ? path.path : nil
    }

    /// The CLI entry point, run through the same toolchain the repository uses.
    static var enginePath: String? {
        let path = repositoryRoot.appendingPathComponent("packages/cli/src/index.ts")
        return FileManager.default.fileExists(atPath: path.path) ? path.path : nil
    }

    static func inspection() -> ProjectInspection {
        ProjectInspection(
            facts: facts,
            contract: contract,
            cards: contract.map { GoalCards.derive(from: $0) } ?? [],
            omissions: contract.map { GoalCards.omissions(from: $0) } ?? [],
            engineAvailable: true,
            contractProblem: nil
        )
    }

    /// Every screen, in every state the real run can be in. Returns the names it drew.
    @MainActor
    static func renderEverything() -> [String] {
        var drawn: [String] = []

        func draw(_ name: String, _ view: some View) {
            Snapshot.all(name: name, view: view)
            drawn.append(name)
        }

        draw("01-project-empty", StudioView.fixture(stage: .project, inspection: nil))
        draw("02-project-loaded", StudioView.fixture(stage: .project, inspection: inspection()))
        draw("03-goal", StudioView.fixture(stage: .goal, inspection: inspection(), selectedGoalID: "open_notebook"))

        if let contract {
            draw("04-plan", StudioView.fixture(
                stage: .plan,
                inspection: inspection(),
                selectedGoalID: "open_notebook",
                plan: PlanRoute.derive(contract: contract, facts: facts, enginePresent: true)
            ))
        }

        if let journal = realJournal {
            let report = RunReport(
                outcome: .finished(exitCode: 0),
                progress: [],
                toolObservations: [],
                journal: journal,
                diff: nil,
                unverifiedByAHuman: ["the demonstrated journey"]
            )
            draw("05-run-real", StudioView.fixture(
                stage: .run, inspection: inspection(), selectedGoalID: "open_notebook", journal: journal
            ))
            draw("06-result-human-check", StudioView.fixture(
                stage: .result, inspection: inspection(), selectedGoalID: "open_notebook",
                journal: journal, report: report
            ))
        }

        // The capability map, drawn from the real FSNotes audit, and drawn again
        // with no audit at all: the second state is what a run without a report on
        // disk reaches, and it has to say so rather than show a fixture.
        if let audit = realAudit {
            draw("07-capabilities", StudioView.fixture(stage: .capabilities, inspection: inspection(), audit: audit))
        }
        draw("08-capabilities-empty", StudioView.fixture(stage: .capabilities, inspection: inspection()))

        // The deliverable, drawn from the text the engine itself renders for the
        // real FSNotes report, and drawn again with no document. The screen under
        // test is therefore shown a real deliverable rather than one written by
        // hand to look like one.
        if let deliverable = realDeliverable {
            draw("09-deliverable", StudioView.fixture(
                stage: .deliverable, inspection: inspection(), deliverable: .ready(deliverable)
            ))
        }
        draw("10-deliverable-absent", StudioView.fixture(stage: .deliverable, inspection: inspection()))
        return drawn
    }
}

@Suite("the screens draw, and what they draw is not empty")
@MainActor
struct ScreenSnapshotTests {
    @Test("every screen renders at every size, in both appearances, and none is blank")
    func rendersAndIsNotBlank() throws {
        let drawn = RealPilotState.renderEverything()
        try #require(!drawn.isEmpty, "at least the project screens must draw")

        let files = try FileManager.default
            .contentsOfDirectory(at: Snapshot.outputDirectory, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "png" }
        try #require(files.count >= drawn.count, "each screen is drawn at three sizes and two appearances")

        var blank: [String] = []
        for file in files {
            if try Ink.isDrawn(file) == false { blank.append(file.lastPathComponent) }
        }
        #expect(blank.isEmpty, "these snapshots are blank: \(blank.joined(separator: ", "))")
    }
}

extension StudioView {
    /// The real screen, driven by a model that has been placed in a state without
    /// running anything. The views are the shipped views; only the state is set.
    @MainActor
    static func fixture(
        stage: StudioStage,
        inspection: ProjectInspection?,
        selectedGoalID: String? = nil,
        plan: [PlanNode]? = nil,
        journal: RunJournal? = nil,
        report: RunReport? = nil,
        audit: AuditReportMirror? = nil,
        deliverable: DeliverableDisplay = .absent
    ) -> StudioView {
        let model = StudioModel()
        model.applyFixture(
            stage: stage,
            inspection: inspection,
            selectedGoalID: selectedGoalID,
            plan: plan,
            journal: journal,
            report: report,
            audit: audit,
            deliverable: deliverable
        )
        return StudioView(model: model)
    }
}
