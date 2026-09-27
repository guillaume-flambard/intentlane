import Testing
import Foundation
@testable import StudioCore

/// The filter row, asserted against the real FSNotes report so the counts a reader
/// of the window sees are the counts the engine produced. A filter that selects a
/// state the report never declared would be selecting a conclusion nobody reached.
struct CapabilityFilterTests {
    private static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()   // StudioCoreTests
        .deletingLastPathComponent()   // Tests
        .deletingLastPathComponent()   // apps/studio
        .deletingLastPathComponent()   // apps
        .deletingLastPathComponent()   // repository root
        .appendingPathComponent("packages/studio-protocol/fixtures/fsnotes-audit.json")

    private func tree() throws -> CapabilityTree {
        let data = try Data(contentsOf: Self.fixtureURL)
        let report = try #require(AuditReportParser.parse(data))
        return CapabilityMapper.map(report)
    }

    @Test func allKeepsEveryFindingAndEveryGroup() throws {
        let filtered = CapabilityFilter.all.apply(to: try tree())
        #expect(filtered.groups.flatMap(\.nodes).count == 51)
        #expect(filtered.groups.count == 10)
        #expect(filtered.groups.map(\.id) == CapabilityTree.catalogueGroups)
    }

    @Test func implementedKeepsOnlyTheFiveTheReportCallsImplemented() throws {
        let filtered = CapabilityFilter.implemented.apply(to: try tree())
        let nodes = filtered.groups.flatMap(\.nodes)
        #expect(nodes.count == 5)
        #expect(nodes.allSatisfy { $0.state == "implemented" })
        // Group order survives the filter: what remains is still catalogue order.
        #expect(filtered.groups.map(\.id) == filtered.groups.map(\.id).filter {
            CapabilityTree.catalogueGroups.contains($0)
        })
    }

    @Test func unknownKeepsTheFortyTwoTheReportHasNotClassified() throws {
        let filtered = CapabilityFilter.unknown.apply(to: try tree())
        #expect(filtered.groups.flatMap(\.nodes).count == 42)
    }

    @Test func problemsIsTheNodesOwnNeedsAttentionWord() throws {
        let filtered = CapabilityFilter.problems.apply(to: try tree())
        let nodes = filtered.groups.flatMap(\.nodes)
        // 51 findings minus the 5 implemented, because a report with no tested or
        // verified state has nothing else to subtract.
        #expect(nodes.count == 46)
        #expect(nodes.allSatisfy { $0.needsAttention })
    }

    @Test func aStateTheReportHasNoneOfYieldsNoGroupRatherThanTheWholeMap() throws {
        let filtered = CapabilityFilter.tested.apply(to: try tree())
        #expect(filtered.groups.isEmpty)
        #expect(filtered.groups.flatMap(\.nodes).isEmpty)
    }

    @Test func anUnknownGroupIsKeptLastAfterAnyFilter() throws {
        let finding = AuditFindingMirror(
            capability: "safety.made-up",
            platform: "macos",
            state: "unknown",
            confidence: "low",
            evidence: [],
            requirements: [],
            gaps: [],
            nextAction: ""
        )
        let report = AuditReportMirror(
            reportVersion: "1.0",
            targetName: "MyApp",
            platform: "macos",
            findings: [finding],
            score: nil,
            catalogue: "27.0"
        )
        let filtered = CapabilityFilter.all.apply(to: CapabilityMapper.map(report))
        #expect(filtered.groups.map(\.id) == ["other"])
    }
}
