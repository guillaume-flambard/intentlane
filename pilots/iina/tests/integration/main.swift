import AppIntents
import Foundation

// IntentLane IINA pilot — integration tests.
//
// These compile the generated entities with the pilot's real resolver, open path
// and search routing, then drive them with a fake history source, a recording
// player and a recording search surface. What is under test is production code:
// only the three IINA seams (playback history, player, history window) are
// replaced, because the point is to execute the integration without launching IINA.
//
// What this still cannot prove is left out on purpose: that the operating system
// resolves a spoken name to these entities, and what Spotlight shows. Those are
// observed claims, not deterministic ones.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Doubles

final class FakeHistorySource: IntentLanePlayedMediaHistorySource {
  var isRecordingEnabled = true
  var inputs: [PlayedMediaInput] = []
  var existingPaths: Set<String> = []

  func currentInputs() -> [PlayedMediaInput] { inputs }
  func fileExists(at url: URL) -> Bool { existingPaths.contains(url.path) }
}

final class RecordingPlayer: IINAPlaybackOpening {
  private(set) var opened: [URL] = []
  func open(_ url: URL) { opened.append(url) }
}

@MainActor
final class RecordingSearchSurface: IntentLaneInAppSearchSurface {
  private(set) var terms: [String] = []
  func applySearch(_ term: String) { terms.append(term) }
}

// MARK: - Fixtures

let now = Date()
func input(_ name: String, title: String?, md5: String, ext: String) -> PlayedMediaInput {
  PlayedMediaInput(
    url: URL(fileURLWithPath: "/private/tmp/iina-fixtures/\(name).\(ext)"),
    name: name,
    title: title,
    mpvMd5: md5,
    addedDate: now
  )
}

let aurora = input("Aurora", title: "Aurora", md5: "md5-aurora", ext: "mp4")
let auroraHomonym = input("Aurora", title: "Aurora", md5: "md5-aurora-2", ext: "mov")
let borealis = input("Borealis", title: nil, md5: "md5-borealis", ext: "mkv")
let cygnus = input("fixture-03", title: "Cygnus", md5: "md5-cygnus", ext: "mp4")
let allInputs = [aurora, auroraHomonym, borealis, cygnus]

func makeSource(recording: Bool = true, existing: Set<String>? = nil) -> FakeHistorySource {
  let source = FakeHistorySource()
  source.isRecordingEnabled = recording
  source.inputs = allInputs
  source.existingPaths = existing ?? Set(allInputs.map(\.url.path))
  return source
}

// MARK: - Resolver

let resolver = IntentLanePlayedMediaResolverImplementation(source: makeSource())

let exact = try await resolver.playedMediaEntities(matching: "Borealis")
check(exact.map(\.id) == ["md5-borealis"], "an exact title resolves that one item")
check(exact.first?.title == "Borealis", "the stored title or the basename is what the user sees")

let homonyms = try await resolver.playedMediaEntities(matching: "aurora")
check(homonyms.count == 2, "two items sharing a title both stay resolvable, so the system can ask which")
check(Set(homonyms.map(\.id)) == ["md5-aurora", "md5-aurora-2"], "the homonyms are the two distinct items")

let diacritics = try await resolver.playedMediaEntities(matching: "Cygne")
check(diacritics.isEmpty, "a title that is not the stored title does not match")
let storedTitle = try await resolver.playedMediaEntities(matching: "Cygnus")
check(storedTitle.map(\.id) == ["md5-cygnus"], "the stored title matches even when the file name does not")

check(try await resolver.playedMediaEntities(matching: "invented").isEmpty, "an unknown title resolves nothing")
check(try await resolver.playedMediaEntities(matching: "   ").isEmpty, "a blank query resolves nothing, never everything")

let byIdentifier = try await resolver.playedMediaEntities(for: ["md5-aurora", "md5-borealis"])
check(byIdentifier.map(\.id).sorted() == ["md5-aurora", "md5-borealis"], "asking by identifier returns exactly those items")

let suggested = try await resolver.suggestedPlayedMediaEntities()
check(suggested.map(\.id) == ["md5-aurora", "md5-aurora-2", "md5-borealis", "md5-cygnus"],
      "suggestions keep the history order, so recency is carried by the order")

check(suggested.allSatisfy { $0.kind == "Video" || $0.kind == nil }, "the subtitle is the media kind")

let withDeleted = IntentLanePlayedMediaResolverImplementation(
  source: makeSource(existing: Set([aurora.url.path, borealis.url.path]))
)
let afterDeletion = try await withDeleted.suggestedPlayedMediaEntities()
check(afterDeletion.map(\.id) == ["md5-aurora", "md5-borealis"], "a record whose file disappeared is not offered")

let recordingOff = IntentLanePlayedMediaResolverImplementation(source: makeSource(recording: false))
check(try await recordingOff.suggestedPlayedMediaEntities().isEmpty, "nothing is offered while history recording is off")
check(try await recordingOff.playedMediaEntities(matching: "Aurora").isEmpty, "and nothing resolves while recording is off")

// MARK: - Open path

let openPlayer = RecordingPlayer()
let openHandler = IntentLaneOpenPlayedMediaImplementation(source: makeSource(), player: openPlayer)
try await openHandler.perform(target: IntentLanePlayedMediaEntity(id: "md5-aurora", title: "Aurora", kind: "Video"))
check(openPlayer.opened == [aurora.url], "opening a resolved item calls the playback seam once with its exact URL")

let unknownPlayer = RecordingPlayer()
let unknownTarget = IntentLaneOpenPlayedMediaImplementation(source: makeSource(), player: unknownPlayer)
do {
  try await unknownTarget.perform(target: IntentLanePlayedMediaEntity(id: "md5-invented", title: "Invented", kind: nil))
  check(false, "opening an unknown identifier throws")
} catch {
  check(true, "opening an unknown identifier throws")
}
check(unknownPlayer.opened.isEmpty, "and calls the playback seam zero times")

let deletedPlayer = RecordingPlayer()
let deletedTarget = IntentLaneOpenPlayedMediaImplementation(
  source: makeSource(existing: [aurora.url.path]), player: deletedPlayer
)
do {
  try await deletedTarget.perform(target: IntentLanePlayedMediaEntity(id: "md5-cygnus", title: "Cygnus", kind: "Video"))
  check(false, "opening a record whose file disappeared throws")
} catch {
  check(true, "opening a record whose file disappeared throws")
}
check(deletedPlayer.opened.isEmpty, "and never substitutes another item for the missing one")

let offPlayer = RecordingPlayer()
let offHandler = IntentLaneOpenPlayedMediaImplementation(source: makeSource(recording: false), player: offPlayer)
do {
  try await offHandler.perform(target: IntentLanePlayedMediaEntity(id: "md5-aurora", title: "Aurora", kind: "Video"))
  check(false, "opening while history recording is off throws")
} catch {
  check(true, "opening while history recording is off throws")
}
check(offPlayer.opened.isEmpty, "and performs no playback at all")

// MARK: - Search routing

let surface = await MainActor.run { RecordingSearchSurface() }
let searchHandler = await IntentLaneSearchPlayedMediaImplementation(surface: surface)
try await searchHandler.perform(criteria: StringSearchCriteria(term: "Borealis"))
check(await MainActor.run { surface.terms } == ["Borealis"], "a system search request reaches the in-app search surface with its term")

if failures == 0 {
  print("ALL INTEGRATION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
