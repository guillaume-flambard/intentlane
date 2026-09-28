import Testing
import Foundation
@testable import StudioCore

/// The states the map may name, and nothing else.
///
/// `openspec/specs/studio-capability-map/spec.md` says the map's states are the
/// report's six and that no `verified` state is declared by it. An earlier
/// version of `needsAttention` carried `state != "verified"`, which the
/// requirement forbids and no test caught, because every test asserted a
/// behaviour and never asserted the absence of a state.
///
/// The test that would have caught it is here: it reads the source of the map
/// and fails on any state literal the report does not produce, so putting one
/// back breaks the build instead of contradicting the contract in silence.
struct CapabilityStatesTests {
    private static let reportStates: Set<String> = [
        "unsupported", "unknown", "detected", "implemented", "tested", "feasible"
    ]

    /// The map's own source, found from `#filePath` because `swift test` may run
    /// from anywhere and the working directory is not the package.
    private static var mapSources: String {
        let directory = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // StudioCoreTests
            .deletingLastPathComponent()   // Tests
            .deletingLastPathComponent()   // studio
            .appendingPathComponent("Sources/StudioCore")
        let enumerator = FileManager.default.enumerator(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )
        var text = ""
        while let url = enumerator?.nextObject() as? URL {
            guard url.lastPathComponent.hasPrefix("Capability"), url.pathExtension == "swift" else { continue }
            text += (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        }
        return text
    }

    /// Every `state != "x"` and `state == "x"` comparison the map makes, which is
    /// where a state literal appears that the report never produces.
    private static func stateLiterals(in source: String) -> [String] {
        // A plain scan rather than a regular expression over Swift source: the
        // only shape that matters is a state compared to a string literal, and
        // `try!` on a hand-written pattern would put a crash between the reader
        // and the verdict.
        var found: [String] = []
        let words = source.split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" || $0 == "\r" })
        for (index, word) in words.enumerated() {
            guard word == "state", index + 2 < words.count else { continue }
            let comparison = words[index + 1]
            guard comparison == "!=" || comparison == "==" else { continue }
            let literal = words[index + 2]
            guard literal.hasPrefix("\""), literal.hasSuffix("\""), literal.count >= 2 else { continue }
            found.append(String(literal.dropFirst().dropLast()))
        }
        return found
    }

    @Test("the map names no state the report does not produce")
    func namesNoUndeclaredState() {
        let literals = Self.stateLiterals(in: Self.mapSources)
        #expect(!literals.isEmpty, "the map compares no state at all, which means the source was not read")

        let forbidden = literals.filter { !Self.reportStates.contains($0) }
        #expect(
            forbidden.isEmpty,
            "the capability map names states the report never produces: \(forbidden.joined(separator: ", ")). The spec declares the report's six and no other."
        )
    }

    @Test("the declared state list is the report's six")
    func declaredStatesAreTheReportSix() {
        #expect(
            Set(CapabilityMapper.states) == Self.reportStates,
            "CapabilityMapper.states and the report's states have diverged, so the totals row would show a column the report never fills"
        )
    }

    @Test("needsAttention is settled for the two settled states and open for the rest")
    func needsAttentionFollowsTheSettledStates() {
        for state in Self.reportStates {
            let node = nodeIn(state)
            let expected = state != "implemented" && state != "tested"
            #expect(
                node.needsAttention == expected,
                "\(state) is \(node.needsAttention ? "open" : "settled") and should be \(expected ? "open" : "settled")"
            )
        }
    }

    private func nodeIn(_ state: String) -> CapabilityNode {
        let report = AuditReportMirror(
            reportVersion: "1.0",
            targetName: "MyApp",
            platform: "macos",
            findings: [AuditFindingMirror(
                capability: "discovery.entity-query",
                platform: "macos",
                state: state,
                confidence: "low",
                evidence: [],
                requirements: [],
                gaps: [],
                nextAction: ""
            )],
            score: nil,
            catalogue: "27.0"
        )
        return CapabilityMapper.map(report).groups[0].nodes[0]
    }
}
