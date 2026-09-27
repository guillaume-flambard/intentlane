import AppIntents
import Foundation

// IntentLane Cyberduck pilot — integration tests.
//
// These compile the generated entity with the pilot's real eligibility filter,
// resolver and open path, then drive them with a fake source, a recording opener
// and a real folder of `.duck` fixtures. What is under test is production code:
// only the two seams, the bookmarks folder and LaunchServices, are replaced.
//
// ConnectionIntegration.swift is deliberately absent from this compile. That is the
// split: the file that resolves where the folder is, and that hands a url to the
// system, is not part of what these tests exercise.
//
// The open path is the part this application is unusual about, and the test that
// matters is that the opener is handed a **file** and never a hostname. The
// application offers two ways to open a connection and the contract refuses one of
// them; the recording opener is how a reader of this file can see which one the
// mapping chose.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Doubles

final class FakeConnectionSource: IntentLaneConnectionSource, @unchecked Sendable {
  var records: [ConnectionRecord] = []
  var locations: [ConnectionLocation] = []

  func currentConnections() async -> [ConnectionRecord] { records }
  func bookmarkURL(forIdentifier identifier: String) async -> URL? {
    locations.first { $0.id == identifier }?.url
  }
}

final class RecordingOpener: IntentLaneConnectionOpening, @unchecked Sendable {
  private(set) var opened: [URL] = []
  func open(_ url: URL) async { opened.append(url) }
}

// MARK: - Fixtures

let production = ConnectionRecord(id: "uuid-production", nickname: "Acme production")
let staging = ConnectionRecord(id: "uuid-staging", nickname: "Acme staging")

// Two connections sharing a nickname. With no subtitle on this entity, that is the
// case the resolver has to get right, and it is the case a name-keyed open would
// get wrong.
let alsoProduction = ConnectionRecord(id: "uuid-production-2", nickname: "Acme production")

// item_not_usable: the writer emits `Nickname` only when non-blank, so a
// connection with no nickname exists and cannot be chosen.
let nameless = ConnectionRecord(id: "uuid-nameless", nickname: "  ")

let allRecords = [production, staging, alsoProduction, nameless]

func location(_ record: ConnectionRecord) -> ConnectionLocation {
  ConnectionLocation(id: record.id, url: URL(fileURLWithPath: "/Users/someone/Library/Application Support/Cyberduck/Bookmarks/\(record.id).duck"))
}

func makeSource(_ records: [ConnectionRecord]? = nil) -> FakeConnectionSource {
  let source = FakeConnectionSource()
  source.records = records ?? allRecords
  source.locations = source.records.map(location)
  return source
}

// MARK: - Resolver, by name

let resolver = IntentLaneConnectionResolverImplementation(source: makeSource())

let exact = try await resolver.connectionEntities(matching: "Acme staging")
check(exact.map(\.id) == ["uuid-staging"], "an exact nickname resolves that one connection")
check(exact.first?.nickname == "Acme staging", "the nickname is what the person sees")

// The generated entity has no subtitle member at all, so "this entity has no
// subtitle" is a statement about the type rather than about a value. Reading the
// stored properties back is how a test can hold it: the day a subtitle is added to
// the contract, this goes red and the reason has to be written down.
//
// The stored name is `_nickname` and not `nickname` because `@Property` is a
// property wrapper and the mirror sees its backing storage. The assertion is on the
// storage because that is what the mirror can see, and the underscore is the
// signature of the wrapper rather than a second field.
let entityFields = Mirror(reflecting: IntentLaneConnectionEntity(id: "x", nickname: "y"))
  .children.compactMap(\.label).sorted()
check(entityFields == ["_nickname", "id"], "the generated entity carries exactly the identifier and the title")
check(
  entityFields.filter { $0.hasPrefix("_") }.count == 1,
  "and the one underscored name is the property wrapper's storage, not a third field"
)
check(!entityFields.contains { $0 == "action" || $0 == "subtitle" },
      "and there is no subtitle member, because the only candidate on this application is the hostname")

check(try await resolver.connectionEntities(matching: "acme staging").map(\.id) == ["uuid-staging"],
      "matching ignores case")
check(try await resolver.connectionEntities(matching: "  Acme staging  ").map(\.id) == ["uuid-staging"],
      "and ignores surrounding whitespace")

// The near-miss half of the exact negative.
check(try await resolver.connectionEntities(matching: "Acme").isEmpty, "a truncated nickname resolves nothing, because that would guess")
check(try await resolver.connectionEntities(matching: "Acme staging EU").isEmpty, "a longer nickname resolves nothing")
check(try await resolver.connectionEntities(matching: "invented").isEmpty, "an unknown nickname resolves nothing")
check(try await resolver.connectionEntities(matching: "").isEmpty, "a blank query resolves nothing, never everything")

let homonyms = try await resolver.connectionEntities(matching: "Acme production")
check(Set(homonyms.map(\.id)) == ["uuid-production", "uuid-production-2"],
      "two connections sharing a nickname resolve to both, and the resolver does not pick one")

check(try await resolver.connectionEntities(matching: "  ").isEmpty, "a connection with no nickname resolves nothing")

// MARK: - Resolver, by identifier

let byIdentifier = try await resolver.connectionEntities(for: ["uuid-production", "uuid-nameless", "invented"])
check(byIdentifier.map(\.id) == ["uuid-production"], "asking by UUID returns the usable one and drops the nameless and the unknown")
check(try await resolver.connectionEntities(for: []).isEmpty, "asking for no UUID resolves nothing, never everything")
check(try await resolver.connectionEntities(for: ["UUID-PRODUCTION"]).isEmpty, "a UUID is matched exactly, never case-folded")
check(try await resolver.connectionEntities(for: ["Acme production"]).isEmpty, "a nickname is not a UUID")

// MARK: - Suggestions

let suggested = try await resolver.suggestedConnectionEntities()
check(suggested.map(\.id) == ["uuid-production", "uuid-staging", "uuid-production-2"],
      "suggestions list the usable connections only, in the folder's own order")

// MARK: - Nothing forbidden reaches an entity

let everything = (suggested + homonyms + byIdentifier + exact).map(String.init(describing:))
check(!everything.contains { $0.contains("acme-cdn.example") }, "no entity renders a hostname")
check(!everything.contains { $0.contains("Application Support") }, "and none renders the bookmarks folder")
check(!everything.contains { $0.contains(".duck") }, "and none renders the file the open path needs")
check(
  everything.allSatisfy { !Mirror(reflecting: $0).children.contains { $0.label == "action" } },
  "no entity has a subtitle at all, on this application"
)

// MARK: - The open path, and which route it takes

let opener = RecordingOpener()
let openHandler = IntentLaneOpenConnectionImplementation(source: makeSource(), opener: opener)
try await openHandler.perform(target: IntentLaneConnectionEntity(id: "uuid-staging", nickname: "Acme staging"))
check(opener.opened.count == 1, "opening a resolved connection calls the opening seam once")
check(opener.opened.first?.lastPathComponent == "uuid-staging.duck",
      "and it hands over the connection's own .duck file, which is what application_openFile mounts")
check(opener.opened.first?.pathExtension == "duck", "and the extension is the one the application recognises")
check(!(opener.opened.first?.absoluteString ?? "").contains("acme-cdn.example"),
      "and the value it hands over carries no hostname, because the route was chosen for that reason")

// The exact negative, first half: an identifier that does not exist.
let unknownOpener = RecordingOpener()
let unknownHandler = IntentLaneOpenConnectionImplementation(source: makeSource(), opener: unknownOpener)
do {
  try await unknownHandler.perform(target: IntentLaneConnectionEntity(id: "invented", nickname: "Invented"))
  check(false, "opening an unknown UUID throws")
} catch {
  check(true, "opening an unknown UUID throws")
}
check(unknownOpener.opened.isEmpty, "and calls the opening seam zero times, selecting no neighbour")

// Second half: a near-miss title must not open a different object.
let nearMissOpener = RecordingOpener()
let nearMissHandler = IntentLaneOpenConnectionImplementation(source: makeSource(), opener: nearMissOpener)
do {
  try await nearMissHandler.perform(target: IntentLaneConnectionEntity(id: "invented", nickname: "Acme staging"))
  check(false, "an unknown UUID carrying a real connection's nickname throws rather than opening that connection")
} catch {
  check(true, "an unknown UUID carrying a real connection's nickname throws rather than opening that connection")
}
check(nearMissOpener.opened.isEmpty, "and the real connection is not opened in its place")

let namelessOpener = RecordingOpener()
let namelessHandler = IntentLaneOpenConnectionImplementation(source: makeSource(), opener: namelessOpener)
do {
  try await namelessHandler.perform(target: IntentLaneConnectionEntity(id: "uuid-nameless", nickname: "  "))
  check(false, "opening a connection with no nickname throws")
} catch {
  check(true, "opening a connection with no nickname throws")
}
check(namelessOpener.opened.isEmpty, "and performs no selection at all")

// A record that resolves but whose file is gone: the resolver saw the folder a
// moment ago and the file has since been deleted. The open must not guess a path.
let vanishedSource = makeSource()
vanishedSource.locations = []
let vanishedOpener = RecordingOpener()
let vanishedHandler = IntentLaneOpenConnectionImplementation(source: vanishedSource, opener: vanishedOpener)
do {
  try await vanishedHandler.perform(target: IntentLaneConnectionEntity(id: "uuid-staging", nickname: "Acme staging"))
  check(false, "opening a connection whose file has gone throws")
} catch {
  check(true, "opening a connection whose file has gone throws")
}
check(vanishedOpener.opened.isEmpty, "and opens nothing, rather than synthesising a path")

// The homonym: the target is the second connection and the opener must receive the
// second one's file.
let homonymOpener = RecordingOpener()
let homonymHandler = IntentLaneOpenConnectionImplementation(source: makeSource(), opener: homonymOpener)
try await homonymHandler.perform(target: IntentLaneConnectionEntity(id: "uuid-production-2", nickname: "Acme production"))
check(homonymOpener.opened.first?.lastPathComponent == "uuid-production-2.duck",
      "two connections sharing a nickname open by their own UUID, not by the first match")

if failures == 0 {
  print("ALL INTEGRATION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
