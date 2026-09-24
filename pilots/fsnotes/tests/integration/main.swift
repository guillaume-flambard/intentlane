import AppIntents
import Foundation

// IntentLane FSNotes pilot — integration tests.
//
// These compile the generated entities with the pilot's real eligibility filter,
// resolver, open path and search routing, then drive them with a fake notebook
// source, a recording opener and a recording search surface. What is under test
// is production code: only the FSNotes seams (the project list, the sidebar and
// the in-app search) are replaced, because the point is to execute the
// integration without launching FSNotes.
//
// What this still cannot prove is left out on purpose: that the operating system
// resolves a spoken name to these entities, and what Spotlight shows. Those are
// observed claims, not deterministic ones.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Doubles

final class FakeNotebookSource: IntentLaneNotebookSource, @unchecked Sendable {
  var notebooks: [NotebookRecord] = []

  func currentNotebooks() -> [NotebookRecord] { notebooks }
}

final class RecordingOpener: IntentLaneNotebookOpening, @unchecked Sendable {
  private(set) var opened: [String] = []
  func open(_ id: String) { opened.append(id) }
}

@MainActor
final class RecordingSearchSurface: IntentLaneNotebookSearchSurface {
  private(set) var terms: [String] = []
  func applySearch(_ term: String) { terms.append(term) }
}

// MARK: - Fixtures

// One ordinary notebook, the positive of this pilot.
let plain = NotebookRecord(id: "id-notes", title: "Notes", context: nil)

// The same label twice, so the system can ask which one rather than guess.
let homonym = NotebookRecord(id: "id-archive", title: "Archive", context: nil)
let nestedHomonym = NotebookRecord(id: "id-archive-2025", title: "Archive", context: "Notes")

// A nested notebook: the ancestor path is the only thing that tells it apart.
let nested = NotebookRecord(id: "id-receipts", title: "Receipts", context: "Taxes/2025")

// Everything that must never become an entity, whatever else is true of it.
// An encrypted notebook is excluded whether it is locked or not, so the two
// encrypted fixtures differ only in identity: the filter never reads lockedness.
let trashed = NotebookRecord(id: "id-trash", title: "Trashed", context: nil, isTrash: true)
let encryptedUnlocked = NotebookRecord(id: "id-enc-open", title: "Diary", context: nil, isEncrypted: true)
let encryptedLocked = NotebookRecord(id: "id-enc-shut", title: "Taxes 2024", context: nil, isEncrypted: true)
let virtualItem = NotebookRecord(id: "id-all", title: "All Notes", context: nil, isVirtual: true)
let bookmark = NotebookRecord(id: "id-bookmark", title: "Shared", context: nil, isBookmark: true)

let allNotebooks = [plain, homonym, nestedHomonym, nested, trashed, encryptedUnlocked, encryptedLocked, virtualItem, bookmark]

func makeSource(_ notebooks: [NotebookRecord]? = nil) -> FakeNotebookSource {
  let source = FakeNotebookSource()
  source.notebooks = notebooks ?? allNotebooks
  return source
}

// MARK: - Resolver

let resolver = IntentLaneNotebookResolverImplementation(source: makeSource())

let exact = try await resolver.notebookEntities(matching: "Notes")
check(exact.map(\.id) == ["id-notes"], "an exact label resolves that one notebook")
check(exact.first?.title == "Notes", "the folder name is what the user sees")

let caseInsensitive = try await resolver.notebookEntities(matching: "notes")
check(caseInsensitive.map(\.id) == ["id-notes"], "matching a label ignores case")

let homonyms = try await resolver.notebookEntities(matching: "Archive")
check(homonyms.count == 2, "two notebooks sharing a label both stay resolvable, so the system can ask which")
check(Set(homonyms.map(\.id)) == ["id-archive", "id-archive-2025"], "the homonyms are the two distinct notebooks")

check(try await resolver.notebookEntities(matching: "Recept").isEmpty, "a partial label does not match, because it would guess")
check(try await resolver.notebookEntities(matching: "invented").isEmpty, "an unknown label resolves nothing")
check(try await resolver.notebookEntities(matching: "   ").isEmpty, "a blank query resolves nothing, never everything")

check(try await resolver.notebookEntities(matching: "Trashed").isEmpty, "a trashed notebook does not resolve by label")
check(try await resolver.notebookEntities(matching: "Diary").isEmpty, "an encrypted notebook does not resolve by label, unlocked or not")
check(try await resolver.notebookEntities(matching: "Taxes 2024").isEmpty, "and a locked encrypted one leaks nothing either")
check(try await resolver.notebookEntities(matching: "All Notes").isEmpty, "a virtual notebook does not resolve by label")
check(try await resolver.notebookEntities(matching: "Shared").isEmpty, "a bookmark does not resolve by label")

let byIdentifier = try await resolver.notebookEntities(for: ["id-notes", "id-receipts", "id-trash", "id-enc-shut"])
check(Set(byIdentifier.map(\.id)) == ["id-notes", "id-receipts"],
      "asking by identifier returns the eligible ones and drops the trashed and encrypted ones")

check(try await resolver.notebookEntities(for: ["md5-invented"]).isEmpty, "an unknown identifier resolves nothing")
check(try await resolver.notebookEntities(for: []).isEmpty, "asking for no identifier resolves nothing, never everything")

let suggested = try await resolver.suggestedNotebookEntities()
check(suggested.map(\.id) == ["id-notes", "id-archive", "id-archive-2025", "id-receipts"],
      "suggestions list only eligible notebooks, in the application's own order")

// MARK: - Presentation

check(try await resolver.notebookEntities(matching: "Notes").first?.context == nil,
      "a top-level notebook carries no ancestor path in its subtitle")
check(try await resolver.notebookEntities(matching: "Receipts").first?.context == "Taxes/2025",
      "a nested notebook carries its ancestor path, which is the only thing that tells it apart")
check(suggested.allSatisfy { $0.context?.contains("/Users/") != true },
      "no subtitle ever contains a file path")

// MARK: - Open path

let opener = RecordingOpener()
let openHandler = IntentLaneOpenNotebookImplementation(source: makeSource(), opener: opener)
try await openHandler.perform(target: IntentLaneNotebookEntity(id: "id-receipts", title: "Receipts", context: "Taxes/2025"))
check(opener.opened == ["id-receipts"], "opening a resolved notebook calls the opening seam once with its exact id")

let unknownOpener = RecordingOpener()
let unknownHandler = IntentLaneOpenNotebookImplementation(source: makeSource(), opener: unknownOpener)
do {
  try await unknownHandler.perform(target: IntentLaneNotebookEntity(id: "id-invented", title: "Invented", context: nil))
  check(false, "opening an unknown identifier throws")
} catch {
  check(true, "opening an unknown identifier throws")
}
check(unknownOpener.opened.isEmpty, "and calls the opening seam zero times")

let encryptedOpener = RecordingOpener()
let encryptedHandler = IntentLaneOpenNotebookImplementation(source: makeSource(), opener: encryptedOpener)
do {
  try await encryptedHandler.perform(target: IntentLaneNotebookEntity(id: "id-enc-shut", title: "Notes", context: nil))
  check(false, "opening an encrypted identifier throws even when a plain notebook shares the label")
} catch {
  check(true, "opening an encrypted identifier throws even when a plain notebook shares the label")
}
check(encryptedOpener.opened.isEmpty, "and never substitutes the same-named notebook for it")

let trashedOpener = RecordingOpener()
let trashedHandler = IntentLaneOpenNotebookImplementation(source: makeSource(), opener: trashedOpener)
do {
  try await trashedHandler.perform(target: IntentLaneNotebookEntity(id: "id-trash", title: "Trashed", context: nil))
  check(false, "opening a trashed identifier throws")
} catch {
  check(true, "opening a trashed identifier throws")
}
check(trashedOpener.opened.isEmpty, "and performs no selection at all")

// MARK: - Search routing

let surface = await MainActor.run { RecordingSearchSurface() }
let searchHandler = IntentLaneSearchNotebooksImplementation(surface: surface)
try await searchHandler.perform(criteria: StringSearchCriteria(term: "Receipts"))
check(await MainActor.run { surface.terms } == ["Receipts"], "a system search request reaches the in-app search surface with its term")
check(opener.opened == ["id-receipts"], "and a search opens nothing, it routes the list")

let blankSurface = await MainActor.run { RecordingSearchSurface() }
let blankHandler = IntentLaneSearchNotebooksImplementation(surface: blankSurface)
try await blankHandler.perform(criteria: StringSearchCriteria(term: ""))
check(await MainActor.run { blankSurface.terms }.isEmpty, "a blank search term is not routed as a real term")

if failures == 0 {
  print("ALL INTEGRATION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
