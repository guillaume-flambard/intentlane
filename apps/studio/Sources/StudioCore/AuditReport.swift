import Foundation

/// The audit report, typed exactly as `AuditReport` in
/// `packages/core/src/audit.ts` declares it.
///
/// The TypeScript side is the authority. This file does not relax it: a screen
/// that shows a state the engine did not declare is showing a conclusion the
/// engine did not reach, and a screen that hides an unsupported capability is
/// hiding the one thing a developer must see.
///
/// The relationships this window needs from the report are `findings`, `target`,
/// `score` and `catalogue`. Every other block the report may carry (`route`,
/// `data`, `architecture`, `conditions`, `quality`, `targets`, `overlay`) exists
/// in the engine's own shape and is not read as a CapabilityNode.
public struct AuditReportMirror: Sendable, Equatable, Codable {
    public let reportVersion: String
    public let targetName: String
    public let platform: String?
    public let findings: [AuditFindingMirror]
    public let score: AuditScoreMirror?
    public let catalogueVersion: String?

    public init(
        reportVersion: String,
        targetName: String,
        platform: String?,
        findings: [AuditFindingMirror],
        score: AuditScoreMirror?,
        catalogue: String?
    ) {
        self.reportVersion = reportVersion
        self.targetName = targetName
        self.platform = platform
        self.findings = findings
        self.score = score
        self.catalogueVersion = catalogue
    }
}

public struct AuditFindingMirror: Sendable, Equatable, Codable {
    public let capability: String
    public let platform: String?
    public let state: String
    public let confidence: String
    public let evidence: [AuditEvidenceMirror]
    public let requirements: [String]
    public let gaps: [AuditGapMirror]
    public let nextAction: String

    public init(
        capability: String,
        platform: String?,
        state: String,
        confidence: String,
        evidence: [AuditEvidenceMirror],
        requirements: [String],
        gaps: [AuditGapMirror],
        nextAction: String
    ) {
        self.capability = capability
        self.platform = platform
        self.state = state
        self.confidence = confidence
        self.evidence = evidence
        self.requirements = requirements
        self.gaps = gaps
        self.nextAction = nextAction
    }
}

public struct AuditEvidenceMirror: Sendable, Equatable, Codable {
    public let kind: String
    public let path: String?
    public let line: Int?
    public let platform: String?

    public init(kind: String, path: String?, line: Int?, platform: String?) {
        self.kind = kind
        self.path = path
        self.line = line
        self.platform = platform
    }
}

public struct AuditGapMirror: Sendable, Equatable, Codable {
    public let code: String
    public let message: String

    public init(code: String, message: String) {
        self.code = code
        self.message = message
    }
}

public struct AuditScoreMirror: Sendable, Equatable, Codable {
    public let score: Int
    public let band: String
    public let points: Int
    public let maximum: Int
    public let applicable: Int
    /// `discovery` is the engine's own audit word for how Siri can reach this
    /// application, and it is reused verbatim so a screen never renames what the
    /// engine already said.
    public let discovery: String

    public init(score: Int, band: String, points: Int, maximum: Int, applicable: Int, discovery: String) {
        self.score = score
        self.band = band
        self.points = points
        self.maximum = maximum
        self.applicable = applicable
        self.discovery = discovery
    }
}

/// Reads the JSON `intentlane audit --format json` produces, without claiming
/// more than the parser knows.
public enum AuditReportParser {
    public static func parse(_ data: Data) -> AuditReportMirror? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return parse(object)
    }

    public static func parse(_ object: [String: Any]) -> AuditReportMirror? {
        let reportVersion = object["reportVersion"] as? String ?? "unknown"
        let target = object["target"] as? [String: Any] ?? [:]
        let targetName = target["name"] as? String ?? ""
        let platform = target["platform"] as? String

        let findings: [AuditFindingMirror] = (object["findings"] as? [[String: Any]] ?? []).compactMap { finding in
            let capability = finding["capability"] as? String ?? ""
            guard !capability.isEmpty else { return nil }
            let evidence: [AuditEvidenceMirror] = (finding["evidence"] as? [[String: Any]] ?? []).compactMap { entry in
                AuditEvidenceMirror(
                    kind: entry["kind"] as? String ?? "unknown",
                    path: entry["path"] as? String,
                    line: entry["line"] as? Int,
                    platform: entry["platform"] as? String
                )
            }
            let gaps: [AuditGapMirror] = (finding["gaps"] as? [[String: Any]] ?? []).compactMap { gap in
                AuditGapMirror(code: gap["code"] as? String ?? "unknown", message: gap["message"] as? String ?? "")
            }
            return AuditFindingMirror(
                capability: capability,
                platform: finding["platform"] as? String,
                state: finding["state"] as? String ?? "unknown",
                confidence: finding["confidence"] as? String ?? "low",
                evidence: evidence,
                requirements: finding["requirements"] as? [String] ?? [],
                gaps: gaps,
                nextAction: finding["nextAction"] as? String ?? ""
            )
        }

        var score: AuditScoreMirror?
        if let scoreObject = object["score"] as? [String: Any] {
            score = AuditScoreMirror(
                score: scoreObject["score"] as? Int ?? 0,
                band: scoreObject["band"] as? String ?? "none",
                points: scoreObject["points"] as? Int ?? 0,
                maximum: scoreObject["maximum"] as? Int ?? 0,
                applicable: scoreObject["applicable"] as? Int ?? 0,
                discovery: scoreObject["discovery"] as? String ?? "none"
            )
        }

        let catalogueVersion = (object["catalogue"] as? [String: Any])
            .flatMap { $0["version"] as? String }

        return AuditReportMirror(
            reportVersion: reportVersion,
            targetName: targetName,
            platform: platform,
            findings: findings,
            score: score,
            catalogue: catalogueVersion
        )
    }
}
