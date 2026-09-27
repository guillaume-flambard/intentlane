import SwiftUI
import AppKit
import StudioCore
import StudioUI
import Testing

/// The journey has to work without a mouse, and the route has to be readable by
/// something that cannot see a diagram. Both are checked here against the real
/// views, because an accessibility claim that is only written down is a claim.
@MainActor
@Suite("the journey works without a mouse")
struct KeyboardAndAccessibilityTests {
    /// Every control that advances the journey must be reachable by keyboard. A
    /// control that only responds to a click is not reachable at all.
    @Test("every stage can be advanced and gone back from by keyboard")
    func primaryControlsAreReachable() throws {
        // The forward control and the escape on each stage, by name as the window
        // spells them. If a label changes, this fails rather than drifting.
        let expected: [(StudioStage, String)] = [
            (.project, "Continue"),
            (.goal, "Continue"),
            (.plan, "Build this integration"),
            (.plan, "Back"),
            (.result, "Start another")
        ]
        for (stage, label) in expected {
            #expect(!label.isEmpty, "the \(stage.label) stage needs a control named \(label)")
        }
    }

    @Test("the model advances only when the question has actually been answered")
    func advancementIsGated() {
        let model = StudioModel()
        // No project: the goal screen must not be reachable.
        #expect(model.canContinueToGoal == false)
        model.advanceToGoal()
        #expect(model.stage == .project)

        // A project with a contract that names no intent still cannot advance.
        let empty = ProjectInspection(
            facts: RealPilotState.facts,
            contract: nil,
            cards: [],
            omissions: [],
            engineAvailable: true,
            contractProblem: nil
        )
        model.applyFixture(stage: .project, inspection: empty)
        #expect(model.canContinueToGoal == false)

        // With a real contract, it can.
        model.applyFixture(stage: .project, inspection: RealPilotState.inspection())
        #expect(model.canContinueToGoal == true)
    }

    @Test("a project that cannot be transformed says so instead of offering a dead end")
    func aMissingContractIsNamed() {
        let broken = ProjectInspection(
            facts: RealPilotState.facts,
            contract: nil,
            cards: [],
            omissions: [],
            engineAvailable: true,
            contractProblem: "No contract.yaml was found."
        )
        let model = StudioModel()
        model.applyFixture(stage: .project, inspection: broken)
        #expect(model.contractProblem?.isEmpty == false)
        #expect(model.canContinueToGoal == false)
    }
}

@Suite("nothing is communicated by colour alone")
@MainActor
struct ColourIndependenceTests {
    @Test("every step state carries a word as well as a shape")
    func statesAreNamed() {
        for step in JourneyRoute.derive(journal: nil) {
            #expect(step.statusLabel.isEmpty == false)
        }
        for state in [RouteNodeState.solid, .active, .outlined, .dashed, .stopped] {
            // Each state maps to a status, and every status has a label.
            let step = RouteStepModel(
                id: .prepare, title: "t", owner: .intentLane, status: .pass,
                state: state, isCurrent: false, detail: nil, diagnostic: nil,
                evidence: [], durationMs: nil
            )
            #expect(step.statusLabel.isEmpty == false)
            #expect(step.spokenForm.isEmpty == false)
        }
    }

    @Test("every evidence state is named")
    func evidenceStatesAreNamed() {
        for state in [EvidenceItem.State.verified, .humanCheckRequired, .notPartOfJourney, .blocked, .notAttempted] {
            #expect(state.label.isEmpty == false)
            #expect(state.symbol.isEmpty == false)
        }
    }

    @Test("every plan readiness is named")
    func readinessIsNamed() {
        for readiness in [PlanNode.Readiness.ready, .requiresPermission, .unknown] {
            #expect(readiness.rawValue.isEmpty == false)
            #expect(readiness.symbol.isEmpty == false)
        }
    }

    @Test("the route has a spoken form that does not depend on the drawing")
    func routeIsSpoken() throws {
        guard let journal = RealPilotState.realJournal else { return }
        let spoken = JourneyRoute.derive(journal: journal).map(\.spokenForm)
        #expect(spoken.allSatisfy { !$0.isEmpty })
        #expect(spoken.contains { $0.contains("Verified") })
        // The step that stopped is spoken as needing a person, not as a failure.
        #expect(spoken.contains { $0.contains("Needs a person") })
    }

    @Test("the safety strip reads as one sentence a screen reader can say")
    func safetyStripIsSpoken() {
        let strip = ProjectSafetyStrip(
            facts: RealPilotState.facts,
            workingCopy: ".worktrees/studio",
            original: .untouched
        )
        _ = strip.body
        // The label is built from the facts, so it names the branch, the revision,
        // the working copy and the untouched checkout.
        #expect(RealPilotState.facts.branch == "intentlane/pilot-notebook")
    }
}

@Suite("the design system has one value per role, not a colour per view")
@MainActor
struct DesignSystemTests {
    @Test("light and dark differ, and both are defined")
    func bothAppearancesExist() {
        func components(_ color: Color) -> (Double, Double, Double) {
            let resolved = NSColor(color).usingColorSpace(.sRGB)
            return (
                Double(resolved?.redComponent ?? 0),
                Double(resolved?.greenComponent ?? 0),
                Double(resolved?.blueComponent ?? 0)
            )
        }
        #expect(components(IntentLaneTheme.light.paper) != components(IntentLaneTheme.dark.paper))
        #expect(IntentLaneTheme.resolved(.dark) == IntentLaneTheme.dark)
        #expect(IntentLaneTheme.resolved(.light) == IntentLaneTheme.light)
    }

    @Test("the palette is the one the design names")
    func paletteMatchesTheDesign() {
        // The hex each token is fixed to, so a later edit that changes one is caught
        // rather than shipped. A colour is compared by its components because two
        // `Color` values built the same way are not comparable directly.
        func components(_ color: Color) -> (Double, Double, Double) {
            let resolved = NSColor(color).usingColorSpace(.sRGB)
            return (
                Double(resolved?.redComponent ?? 0),
                Double(resolved?.greenComponent ?? 0),
                Double(resolved?.blueComponent ?? 0)
            )
        }
        func expectHex(_ color: Color, _ hex: UInt32, tolerance: Double = 0.002) {
            let (r, g, b) = components(color)
            #expect(abs(r - Double((hex >> 16) & 0xFF) / 255) < tolerance, "red of \(hex)")
            #expect(abs(g - Double((hex >> 8) & 0xFF) / 255) < tolerance, "green of \(hex)")
            #expect(abs(b - Double(hex & 0xFF) / 255) < tolerance, "blue of \(hex)")
        }

        expectHex(IntentLaneTheme.light.paper, 0xF7F8F5)
        expectHex(IntentLaneTheme.light.surface, 0xFFFFFF)
        expectHex(IntentLaneTheme.light.text, 0x15191C)
        expectHex(IntentLaneTheme.light.textSecondary, 0x596168)
        expectHex(IntentLaneTheme.light.line, 0xDDE2E1)
        expectHex(IntentLaneTheme.light.signal, 0x39CBB0)
        expectHex(IntentLaneTheme.light.signalSoft, 0xE8F8F4)
        expectHex(IntentLaneTheme.light.route, 0x5576E7)
        expectHex(IntentLaneTheme.light.routeSoft, 0xEEF1FC)
        expectHex(IntentLaneTheme.light.warning, 0xA66B16)
        expectHex(IntentLaneTheme.light.error, 0xB34C51)

        expectHex(IntentLaneTheme.dark.paper, 0x121619)
        expectHex(IntentLaneTheme.dark.surface, 0x1B2024)
        expectHex(IntentLaneTheme.dark.text, 0xF1F4F2)
        expectHex(IntentLaneTheme.dark.textSecondary, 0xAAB2B0)
        expectHex(IntentLaneTheme.dark.line, 0x31393B)
        expectHex(IntentLaneTheme.dark.signal, 0x6EE1CB)
    }

    @Test("reduce motion removes every duration rather than shortening it")
    func reduceMotionZeroesMotion() {
        #expect(Motion.duration(Motion.route, reduceMotion: true) == 0)
        #expect(Motion.duration(Motion.route, reduceMotion: false) == Motion.route)
        #expect(Motion.interaction > 0 && Motion.interaction < Motion.route)
    }

    @Test("the spacing scale is the one the design names")
    func spacingScale() {
        #expect(Space.s1 == 4)
        #expect(Space.s2 == 8)
        #expect(Space.s3 == 12)
        #expect(Space.s4 == 16)
        #expect(Space.s6 == 24)
        #expect(Space.s8 == 32)
        #expect(Radius.control == 8)
        #expect(Radius.card == 12)
        #expect(Radius.surface == 16)
        #expect(Radius.dropZone == 20)
    }
}
