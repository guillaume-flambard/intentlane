import Foundation

/// The run journal, typed exactly as `pilotRunJournalSchema` in
/// `packages/schema/src/index.ts` declares it.
///
/// The schema is the authority. This file does not relax it: the two invariants
/// the schema enforces are enforced here too, because a window that shows a
/// passed step with no evidence is showing a completion that did not happen, and
/// a window that shows a blocked step with no reason is hiding the one thing the
/// reader needs.
public enum RunStepID: String, CaseIterable, Sendable, Codable {
    case prepare
    case analyse
    case implement
    case test
    case repair
    case demonstrate
    case deliver

    public static let declaredSequence: [RunStepID] = RunStepID.allCases
}

public enum RunStepStatus: String, CaseIterable, Sendable, Codable {
    case pending
    case pass
    case fail
    case blocked
    case skipped
}

public enum EvidenceKind: String, Sendable, Codable {
    case command
    case build
    case capture
    case appEvent = "app-event"
}

public struct EvidenceEntry: Sendable, Codable, Equatable {
    public let kind: EvidenceKind
    public let command: String?
    public let exitCode: Int?
    public let artifact: String?
    public let note: String?

    public init(
        kind: EvidenceKind,
        command: String? = nil,
        exitCode: Int? = nil,
        artifact: String? = nil,
        note: String? = nil
    ) {
        self.kind = kind
        self.command = command
        self.exitCode = exitCode
        self.artifact = artifact
        self.note = note
    }
}

public struct RunStep: Sendable, Codable, Equatable {
    public let id: RunStepID
    public let status: RunStepStatus
    public let commit: String
    public let attempts: Int
    public let evidence: [EvidenceEntry]
    public let diagnostic: String?
    public let diff: String?
    public let durationMs: Int?
}

public struct RunJournal: Sendable, Codable, Equatable {
    public let schema: String
    public let pilot: String
    public let branch: String
    public let commit: String
    public let steps: [RunStep]

    public func step(_ id: RunStepID) -> RunStep? {
        steps.first { $0.id == id }
    }

    /// The steps that carry a decision, in the order the engine declares them.
    /// A window that renders progress renders this, never a clock.
    public var settled: [RunStep] {
        RunStepID.declaredSequence.compactMap { step($0) }.filter { $0.status != .pending }
    }

    public var isComplete: Bool {
        guard let deliver = step(.deliver), deliver.status == .pass else { return false }
        return steps.allSatisfy { $0.status != .pending && $0.status != .fail && $0.status != .blocked }
    }

    public var blockingDiagnostic: String? {
        steps.first { $0.status == .blocked || $0.status == .fail }?.diagnostic
    }
}

/// Why a journal could not be read. The engine has its own parser and its own
/// `ILA179` / `ILA180` diagnostics; this mirrors the shape of that failure so the
/// window can say what is wrong with the document instead of saying "failed".
public enum JournalError: Error, Equatable, Sendable {
    case unreadable(underlying: String)
    case notAJournal
    case wrongSchema(String)
    case badRevision(field: String, value: String)
    case passedStepWithoutEvidence(RunStepID)
    case blockedStepWithoutDiagnostic(RunStepID)
    case duplicateStep(RunStepID)
    case unknownStep(String)
    case unknownStatus(step: RunStepID, value: String)
    case emptyPilot
    case emptyBranch
    case attemptsOutOfRange(step: RunStepID, value: Int)
}

/// Mirrors the schema's `revisionSchema`, a 7 to 40 character lowercase hex
/// string. Written out rather than compiled, because a global `Regex` is not
/// `Sendable` under Swift 6 and this value is read from any context.
func isRevision(_ value: String) -> Bool {
    (7...40).contains(value.count) && value.allSatisfy { $0.isHexDigit && !$0.isUppercase }
}

/// Names what a JSON value actually held, so a diagnostic about the document is
/// itself true. A missing key and a wrongly typed key read differently.
func describe(_ value: Any?) -> String {
    switch value {
    case .none:
        return "absent"
    case .some(let wrapped):
        return String(describing: wrapped)
    }
}

public enum JournalReader {
    public static let schemaIdentifier = "pilot-run/1.0"

    /// Reads a journal the way `parsePilotRunJournal` reads it: strictly, and
    /// refusing rather than repairing. A window fed a repaired journal would
    /// report a run that the engine never recorded.
    public static func read(_ data: Data) throws -> RunJournal {
        let document: Any
        do {
            document = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw JournalError.unreadable(underlying: String(describing: error))
        }
        guard let root = document as? [String: Any] else { throw JournalError.notAJournal }
        guard let schema = root["schema"] as? String else { throw JournalError.notAJournal }
        guard schema == schemaIdentifier else { throw JournalError.wrongSchema(schema) }

        guard let pilot = root["pilot"] as? String, !pilot.isEmpty else { throw JournalError.emptyPilot }
        guard let branch = root["branch"] as? String, !branch.isEmpty else { throw JournalError.emptyBranch }
        guard let commit = root["commit"] as? String, isRevision(commit) else {
            // Report what was actually read. `String(describing:)` on the optional
            // would say `Optional(nil)` for a missing key, which is a diagnostic
            // that misdescribes the document it is diagnosing.
            throw JournalError.badRevision(field: "commit", value: describe(root["commit"]))
        }
        guard let rawSteps = root["steps"] as? [[String: Any]] else { throw JournalError.notAJournal }

        var steps: [RunStep] = []
        var seen: Set<RunStepID> = []
        for raw in rawSteps {
            guard let rawID = raw["id"] as? String else { throw JournalError.notAJournal }
            guard let id = RunStepID(rawValue: rawID) else { throw JournalError.unknownStep(rawID) }
            guard !seen.contains(id) else { throw JournalError.duplicateStep(id) }
            seen.insert(id)

            guard let rawStatus = raw["status"] as? String else { throw JournalError.notAJournal }
            guard let status = RunStepStatus(rawValue: rawStatus) else {
                throw JournalError.unknownStatus(step: id, value: rawStatus)
            }
            guard let stepCommit = raw["commit"] as? String, isRevision(stepCommit) else {
                throw JournalError.badRevision(field: "steps.\(rawID).commit", value: describe(raw["commit"]))
            }
            guard let attempts = raw["attempts"] as? Int, (1...3).contains(attempts) else {
                throw JournalError.attemptsOutOfRange(step: id, value: raw["attempts"] as? Int ?? -1)
            }

            var evidence: [EvidenceEntry] = []
            for item in raw["evidence"] as? [[String: Any]] ?? [] {
                guard let rawKind = item["kind"] as? String, let kind = EvidenceKind(rawValue: rawKind) else { continue }
                evidence.append(
                    EvidenceEntry(
                        kind: kind,
                        command: item["command"] as? String,
                        exitCode: item["exitCode"] as? Int,
                        artifact: item["artifact"] as? String,
                        note: item["note"] as? String
                    )
                )
            }

            let step = RunStep(
                id: id,
                status: status,
                commit: stepCommit,
                attempts: attempts,
                evidence: evidence,
                diagnostic: raw["diagnostic"] as? String,
                diff: raw["diff"] as? String,
                durationMs: raw["durationMs"] as? Int
            )
            // The two invariants the schema carries, kept here so a window cannot
            // show a completion or a blockage the engine would have refused.
            if step.status == .pass && step.evidence.isEmpty {
                throw JournalError.passedStepWithoutEvidence(id)
            }
            if step.status == .blocked && (step.diagnostic?.isEmpty ?? true) {
                throw JournalError.blockedStepWithoutDiagnostic(id)
            }
            steps.append(step)
        }

        return RunJournal(schema: schema, pilot: pilot, branch: branch, commit: commit, steps: steps)
    }
}
