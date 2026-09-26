import Foundation

/// The pilot contract, read as what it is: the application's own name, the objects
/// it is willing to expose, and the intents it is willing to answer. The window
/// offers a journey from this document, never from a list of Apple frameworks, so
/// what the user picks is what the engine will actually build.
public struct IntegrationContract: Sendable, Equatable {
    public struct Entity: Sendable, Equatable, Identifiable {
        public let id: String
        public let title: String?

        public init(id: String, title: String? = nil) {
            self.id = id
            self.title = title
        }

        /// The name a person would use, never the identifier alone: the identifier is
        /// the code's word for it.
        public var readableName: String { title ?? id }
    }

    public struct Intent: Sendable, Equatable, Identifiable {
        public let id: String
        public let title: String
        public let summary: String?
        public let schema: String?
        public let target: String?

        public init(id: String, title: String, summary: String? = nil, schema: String? = nil, target: String? = nil) {
            self.id = id
            self.title = title
            self.summary = summary
            self.schema = schema
            self.target = target
        }
    }

    public let name: String
    public let identifier: String
    public let minimumMacOS: String?
    public let entities: [Entity]
    public let intents: [Intent]

    public init(
        name: String,
        identifier: String,
        minimumMacOS: String? = nil,
        entities: [Entity],
        intents: [Intent]
    ) {
        self.name = name
        self.identifier = identifier
        self.minimumMacOS = minimumMacOS
        self.entities = entities
        self.intents = intents
    }
}

/// A parser for the subset of YAML the contract uses: one nested `app` block and two
/// lists of items with a few scalar fields and one localised string each. Written
/// out rather than pulled in, because a window that cannot read its own manifest is
/// a window that guesses.
public enum ContractReader {
    public enum Failure: Error, Equatable, Sendable {
        case unreadable(String)
        case noApplication
        case noIntents
    }

    public static func read(_ url: URL) throws -> IntegrationContract {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            throw Failure.unreadable(url.path)
        }
        guard let contract = parse(text) else { throw Failure.unreadable(url.path) }
        return contract
    }

    public static func parse(_ text: String) -> IntegrationContract? {
        enum Section { case app, entities, intents, other }
        enum Localised { case title, description, none }

        /// A YAML scalar may be quoted. The quotes are syntax, not part of the value,
        /// and leaving them in would put `"10.14"` in a minimum version.
        func scalar(_ raw: String) -> String {
            var value = raw.trimmingCharacters(in: .whitespaces)
            if value.count >= 2,
               (value.hasPrefix("\"") && value.hasSuffix("\"")) || (value.hasPrefix("'") && value.hasSuffix("'")) {
                value = String(value.dropFirst().dropLast())
            }
            return value
        }

        var section = Section.other
        var localised = Localised.none
        var name = ""
        var identifier = ""
        var minimumMacOS: String?
        var entities: [IntegrationContract.Entity] = []
        var intents: [IntegrationContract.Intent] = []
        var entityID: String?
        var entityTitle: String?
        var intentID: String?
        var intentTitle = ""
        var intentSummary: String?
        var intentSchema: String?
        var intentTarget: String?

        func closeEntity() {
            if let entityID { entities.append(.init(id: entityID, title: entityTitle)) }
            entityID = nil
            entityTitle = nil
        }

        func closeIntent() {
            if let intentID, !intentTitle.isEmpty {
                intents.append(.init(
                    id: intentID,
                    title: intentTitle,
                    summary: intentSummary,
                    schema: intentSchema,
                    target: intentTarget
                ))
            }
            intentID = nil
            intentTitle = ""
            intentSummary = nil
            intentSchema = nil
            intentTarget = nil
        }

        for raw in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty || line.hasPrefix("#") { continue }
            let indented = raw.first == " " || raw.first == "\t"
            let content = line.hasPrefix("- ") ? String(line.dropFirst(2)) : line
            let parts = content.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
            let key = parts.first.map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
            let value = scalar(parts.count > 1 ? String(parts[1]) : "")

            if !indented {
                localised = .none
                switch key {
                case "app": section = .app
                case "entities": closeEntity(); closeIntent(); section = .entities
                case "intents": closeEntity(); closeIntent(); section = .intents
                default: section = .other
                }
                continue
            }

            switch section {
            case .app:
                switch key {
                case "name": name = value
                case "id": identifier = value
                case "min_macos": minimumMacOS = value
                default: break
                }
            case .entities:
                if line.hasPrefix("- ") { closeEntity(); entityID = value }
                switch key {
                case "title": localised = value.isEmpty ? .title : .none
                case "en": if localised == .title { entityTitle = value }; localised = .none
                default: localised = .none
                }
            case .intents:
                if line.hasPrefix("- ") { closeIntent(); intentID = value }
                switch key {
                case "title": localised = value.isEmpty ? .title : .none
                case "description": localised = value.isEmpty ? .description : .none
                case "en":
                    if localised == .title { intentTitle = value }
                    if localised == .description { intentSummary = value }
                    localised = .none
                case "schema": intentSchema = value
                case "target": intentTarget = value
                default: localised = .none
                }
            case .other:
                break
            }
        }
        closeEntity()
        closeIntent()

        guard !name.isEmpty else { return nil }
        return IntegrationContract(
            name: name,
            identifier: identifier,
            minimumMacOS: minimumMacOS,
            entities: entities,
            intents: intents
        )
    }
}

/// One thing the application could do, described as an outcome. The technical names
/// the generator will use travel with the card, inside a disclosure, so the user
/// reads an outcome and a developer can still see the seam behind it.
public struct GoalCard: Sendable, Equatable, Identifiable {
    public struct Piece: Sendable, Equatable, Identifiable {
        public let id: String
        public let role: String
        public let name: String

        public init(role: String, name: String) {
            self.id = "\(role) \(name)"
            self.role = role
            self.name = name
        }
    }

    public let id: String
    public let outcome: String
    public let summary: String
    public let pieces: [Piece]
    public let runtimeCheck: String

    public init(id: String, outcome: String, summary: String, pieces: [Piece], runtimeCheck: String) {
        self.id = id
        self.outcome = outcome
        self.summary = summary
        self.pieces = pieces
        self.runtimeCheck = runtimeCheck
    }
}

public enum GoalCards {
    /// What a person is told to expect. It is derived from the contract's own
    /// schema, so the wording cannot promise a surface the engine will not build.
    public static func derive(from contract: IntegrationContract) -> [GoalCard] {
        contract.intents.map { intent in
            let schema = intent.schema ?? ""
            // An intent may name its target, or name none and work on whatever the
            // contract exposes. Reading "item" out of an absent field would put a
            // word in the user's mouth that the contract never wrote.
            let entity = intent.target.flatMap { target in
                contract.entities.first { $0.id == target }
            }
            let subject = entity.map { ($0.readableName).lowercased() }
            let entityName = plural(subject ?? singular(of: contract))

            let outcome: String
            let summary: String
            switch schema {
            case "system.open":
                outcome = subject.map { "Open one \($0) from Spotlight" } ?? intent.title
                summary = subject.map {
                    "Spotlight hands the app a single \($0) name, and the app opens that one in its own window."
                } ?? "The app opens what Spotlight hands it, in its own window."
            case "system.searchInApp":
                outcome = "Search \(entityName) inside the app"
                summary = "The app lists its own \(entityName) filtered by the term, without leaving the app."
            default:
                outcome = intent.title
                summary = intent.summary ?? "The app answers \(intent.title.lowercased()) through the system."
            }

            var pieces: [GoalCard.Piece] = []
            if let entity { pieces.append(.init(role: "IndexedEntity", name: entity.id)) }
            pieces.append(.init(role: "AppIntent", name: intent.id))
            if !schema.isEmpty { pieces.append(.init(role: "AppSchema", name: schema)) }

            return GoalCard(
                id: intent.id,
                outcome: outcome,
                summary: summary,
                pieces: pieces,
                runtimeCheck: "Opening it in Spotlight, and asking Siri for it, is confirmed by a person. No suite can observe that from a shell."
            )
        }
    }

    /// The singular name of what the app exposes, for an intent that does not name
    /// one of them itself. "items" when there is more than one, because a list of
    /// several kinds has no single name to offer.
    static func singular(of contract: IntegrationContract) -> String {
        contract.entities.count == 1
            ? contract.entities[0].readableName.lowercased()
            : "items"
    }

    /// What the contract leaves out, said plainly. A card list that only shows what
    /// exists reads as a promise that nothing else was considered.
    public static func omissions(from contract: IntegrationContract) -> [String] {
        var out: [String] = []
        if !contract.intents.contains(where: { intent in
            let words = "\(intent.id) \(intent.title)".lowercased()
            return ["create", "delete", "rename", "write", "update", "add"].contains { words.contains($0) }
        }) {
            out.append("Nothing is created, renamed or deleted. This pilot opens and searches only.")
        }
        if contract.entities.count == 1, let entity = contract.entities.first {
            out.append("Only \(entity.readableName) is exposed. The contents of a note are not indexed.")
        }
        return out
    }

    private static func plural(_ word: String) -> String {
        guard let last = word.last else { return word }
        if "sxz".contains(last) { return word + "es" }
        if word.hasSuffix("ch") || word.hasSuffix("sh") { return word + "es" }
        if last == "y", let before = word.dropLast().last, !"aeiou".contains(before) {
            return String(word.dropLast()) + "ies"
        }
        return word + "s"
    }
}

/// What the window can read about a project without executing anything from it.
public struct ProjectFacts: Sendable, Equatable {
    public let name: String
    public let repositoryPath: String
    public let branch: String
    public let revision: String
    public let xcodeProject: String?
    public let minimumMacOS: String?
    public let uncommitted: [String]

    public init(
        name: String,
        repositoryPath: String,
        branch: String,
        revision: String,
        xcodeProject: String?,
        minimumMacOS: String?,
        uncommitted: [String]
    ) {
        self.name = name
        self.repositoryPath = repositoryPath
        self.branch = branch
        self.revision = revision
        self.xcodeProject = xcodeProject
        self.minimumMacOS = minimumMacOS
        self.uncommitted = uncommitted
    }

    public var hasUncommittedChanges: Bool { !uncommitted.isEmpty }
    public var platform: String {
        guard let minimumMacOS else { return "Apple platform" }
        return "macOS \(minimumMacOS)+"
    }
}

public enum ProjectReader {
    public static func read(repository: URL, contract: IntegrationContract?) -> ProjectFacts? {
        let git = { (arguments: [String]) -> String in
            Shell.run(URL(fileURLWithPath: "/usr/bin/git"), ["-C", repository.path] + arguments).stdout.trimmed
        }
        let branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
        let revision = git(["rev-parse", "--short=12", "HEAD"])
        guard !revision.isEmpty else { return nil }

        let contents = (try? FileManager.default.contentsOfDirectory(atPath: repository.path)) ?? []
        let xcodeProject = contents
            .filter { $0.hasSuffix(".xcodeproj") || $0.hasSuffix(".xcworkspace") }
            .sorted()
            .first

        var uncommitted = Shell.run(
            URL(fileURLWithPath: "/usr/bin/git"),
            ["-C", repository.path, "status", "--porcelain"]
        ).stdout.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
        uncommitted = uncommitted.filter { !$0.isEmpty }

        return ProjectFacts(
            name: contract?.name ?? repository.lastPathComponent,
            repositoryPath: repository.path,
            branch: branch,
            revision: revision,
            xcodeProject: xcodeProject,
            minimumMacOS: contract?.minimumMacOS,
            uncommitted: uncommitted
        )
    }
}
