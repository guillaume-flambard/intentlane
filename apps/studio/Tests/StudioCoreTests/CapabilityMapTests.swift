import Testing
import Foundation
@testable import StudioCore

/// The same groups and the same verbatim fields the TypeScript `capabilityTree()`
/// binds, asserted here against the same real FSNotes audit report so that the two
/// languages cannot quietly disagree on what the screen is allowed to show.
///
/// If both sides disagree on the shape of the tree from the same input, a reader of
/// TypeScript sees one map and a reader of the window sees another, which is
/// exactly the kind of drift a screen is least able to catch.
struct CapabilityMapTests {
    /// The fixture lives in the TypeScript package at
    /// `packages/studio-protocol/fixtures/fsnotes-audit.json`, which keeps the one
    /// real report in one place and prevents Swift from holding a copy that
    /// could silently drift.
    ///
    /// Found from `#filePath` rather than from a relative path, because `swift
    /// test` may run from anywhere under the repository and the working directory
    /// is not the repository root.
    private static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()   // StudioCoreTests
        .deletingLastPathComponent()   // Tests
        .deletingLastPathComponent()   // apps/studio
        .deletingLastPathComponent()   // apps
        .deletingLastPathComponent()   // repository root
        .appendingPathComponent("packages/studio-protocol/fixtures/fsnotes-audit.json")

    private func realAudit() throws -> AuditReportMirror {
        let data = try Data(contentsOf: Self.fixtureURL)
        return try #require(AuditReportParser.parse(data))
    }

    private func report(findings: [AuditFindingMirror]) -> AuditReportMirror {
        AuditReportMirror(
            reportVersion: "1.0",
            targetName: "MyApp",
            platform: "macos",
            findings: findings,
            score: nil,
            catalogue: "27.0"
        )
    }

    @Test func oneFindingProducesOneNodeUnderItsCatalogueGroup() throws {
        let finding = AuditFindingMirror(
            capability: "discovery.entity-query",
            platform: "macos",
            state: "implemented",
            confidence: "high",
            evidence: [],
            requirements: ["foundation.app-intent"],
            gaps: [],
            nextAction: "Keep it covered"
        )
        let tree = CapabilityMapper.map(report(findings: [finding]))

        #expect(tree.groups.count == 1)
        let bucket = tree.groups[0]
        #expect(bucket.id == "discovery")
        #expect(bucket.nodes.map(\.id) == ["discovery.entity-query"])
        #expect(bucket.nodes[0].state == "implemented")
        #expect(bucket.nodes[0].needsAttention == false)
    }

    @Test func twoFindingsInGroupStayInSourceOrder() {
        let tree = CapabilityMapper.map(report(findings: [
            AuditFindingMirror(capability: "discovery.entity-query", platform: nil, state: "implemented", confidence: "high", evidence: [], requirements: [], gaps: [], nextAction: "a"),
            AuditFindingMirror(capability: "discovery.indexed-entity", platform: nil, state: "detected", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: "b")
        ]))

        #expect(tree.groups.count == 1)
        #expect(tree.groups[0].nodes.map(\.id) == [
            "discovery.entity-query",
            "discovery.indexed-entity"
        ])
    }

    @Test func aFindingOutsideTheCatalogueGroupLandsInOtherLast() {
        let tree = CapabilityMapper.map(report(findings: [
            AuditFindingMirror(capability: "unlisted.thing", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: ""),
            AuditFindingMirror(capability: "discovery.entity-query", platform: nil, state: "implemented", confidence: "high", evidence: [], requirements: [], gaps: [], nextAction: "")
        ]))

        #expect(tree.groups.map(\.id) == ["discovery", "other"])
        #expect(tree.groups[1].nodes.map(\.id) == ["unlisted.thing"])
    }

    @Test func aFindingWithNoEvidenceStaysEmptyAndNothingIsInvented() {
        let tree = CapabilityMapper.map(report(findings: [
            AuditFindingMirror(capability: "proof.metadata", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: "")
        ]))

        #expect(tree.groups[0].nodes[0].evidence.isEmpty)
    }

    @Test func everyAuditStateMapsVerbatimAndNothingElseAppears() {
        let states = ["unsupported", "unknown", "detected", "implemented", "tested", "feasible"]
        let tree = CapabilityMapper.map(report(findings: states.map {
            AuditFindingMirror(capability: "proof.app-intents-testing", platform: nil, state: $0, confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: "")
        }))

        let rendered = tree.groups.flatMap(\.nodes).map(\.state)
        #expect(rendered.count == states.count)
        #expect(Set(rendered) == Set(states))
    }

    @Test func aFindingWithoutADotStillGroupIPs() {
        let tree = CapabilityMapper.map(report(findings: [
            AuditFindingMirror(capability: "foundation", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: "")
        ]))
        #expect(tree.groups[0].id == "foundation")
        #expect(tree.groups[0].nodes[0].id == "foundation")
    }

    @Test func noGroupTheCatalogueDoesNotKnowCanBeRendered() {
        let tree = CapabilityMapper.map(report(findings: [
            AuditFindingMirror(capability: "unlisted.thing", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: ""),
            AuditFindingMirror(capability: "also-unlisted.thing", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: ""),
            AuditFindingMirror(capability: "yet-unlisted.thing", platform: nil, state: "unknown", confidence: "low", evidence: [], requirements: [], gaps: [], nextAction: "")
        ]))

        #expect(tree.groups.map(\.id) == ["other"])
    }

    // MARK: The 51-finding real audit

    @Test func fiftyOneFindingsProduceFiftyOneNodesNoneDropped() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)
        let nodes = tree.groups.flatMap(\.nodes)
        #expect(nodes.count == audit.findings.count)
        #expect(Set(nodes.map(\.id)).count == nodes.count)
    }

    @Test func groupsComeOutInCatalogueOrderAndEveryGroupIsAKnownOne() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)

        #expect(tree.groups.map(\.id) == CapabilityTree.catalogueGroups)
        #expect(tree.groups.map(\.id).contains("other") == false)
    }

    @Test func aNodesStateIsAlwaysAStateTheReportCarries() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)
        for node in tree.groups.flatMap(\.nodes) {
            #expect(["unsupported", "unknown", "detected", "implemented", "tested", "feasible"].contains(node.state))
        }
    }

    @Test func evidenceKeepsItsOwnPathAndLine() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)
        let withEvidence = audit.findings.filter { !$0.evidence.isEmpty }
        #expect(!withEvidence.isEmpty)

        for finding in withEvidence {
            let node = tree.groups.flatMap(\.nodes).first { $0.id == finding.capability }
            #expect(node?.evidence.map(\.path) == finding.evidence.map(\.path))
            #expect(node?.evidence.map(\.line) == finding.evidence.map(\.line))
        }
    }

    @Test func aNodesGapsAndNextActionAreTheFindingOwnsVerbatim() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)
        for node in tree.groups.flatMap(\.nodes) {
            let source = audit.findings.first { $0.capability == node.id }
            #expect(node.gaps == source?.gaps)
            #expect(node.nextAction == source?.nextAction)
        }
    }

    @Test func theScoreSurvivesTheMappingAndNothingElseIsInOut() throws {
        let audit = try realAudit()
        let tree = CapabilityMapper.map(audit)

        let score = try #require(audit.score)
        #expect(tree.score == audit.score)
        #expect(tree.score?.band == score.band)
        #expect(tree.reportVersion == audit.reportVersion)
        #expect(tree.platform == audit.platform)
    }
}
