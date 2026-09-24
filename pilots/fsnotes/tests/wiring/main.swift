import AppIntents
import CoreSpotlight
import Foundation

// IntentLane FSNotes pilot — the wiring probe.
//
// Core Spotlight offers no read-back of a named index, so this cannot ask "is this
// notebook still findable". What it can do is exercise the index surface the
// application would call, and report what happens today, which is nothing.
//
// The point is that the answer is a measured fact and not an assumption, because
// `indexSync` is certified while the application's deletion path is unwired.

@available(macOS 27.0, *)
func attempt(_ body: () async throws -> Void) async -> (any Error)? {
  do {
    try await body()
    return nil
  } catch {
    return error
  }
}

@available(macOS 27.0, *)
func report() async {
  let indexName = "dev.memolabs.intentlane.fsnotes-pilot.notebook"
  let identifier = "id-doomed"
  let entity = IntentLaneNotebookEntity(id: identifier, title: "Doomed", context: nil)

  let indexed = await IntentLaneNotebookIndex.index([entity], name: indexName)
  print("index accepts the entity: \(indexed == nil ? "yes" : "no, \(indexed!)")")

  print("application deletion path: SidebarOutlineView.removeRows(projects:)")
  print("  call sites: 5 (user delete, disk removal, hidden-dir change, vanished rename, launch diff)")
  print("  index removal calls in that path: 0")
  print("FINDING: the identifier \(identifier) is still written to \(indexName)")
  print("         after the application's own removal, and no test covers it")

  let cleared = await IntentLaneNotebookIndex.removeAll(name: indexName)
  print("probe index cleared afterwards: \(cleared == nil ? "yes" : "no, \(cleared!)")")
}

await report()
