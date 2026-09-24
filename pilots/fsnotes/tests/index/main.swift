import AppIntents
import CoreSpotlight
import Foundation

// IntentLane FSNotes pilot — index lifecycle against a real named Core Spotlight
// index.
//
// Core Spotlight offers no read-back of a named index, so this cannot assert that
// a search finds the notebook. What it can assert, and what matters, is that the
// system accepts our generated entity in a real named index, that removal is
// idempotent, and that a full refresh cycle succeeds. The production index name is
// checked here so a rename cannot pass unnoticed.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

@available(macOS 27.0, *)
func run() async throws {
  check(
    IntentLaneNotebookIndex.productionName == "dev.memolabs.intentlane.fsnotes-pilot.notebook",
    "the production index name is the one the generated code uses"
  )

  let name = "dev.memolabs.intentlane.fsnotes-pilot.notebook.index-test"
  let entity = IntentLaneNotebookEntity(id: "id-notes", title: "Notes", context: nil)
  let nested = IntentLaneNotebookEntity(id: "id-receipts", title: "Receipts", context: "Taxes/2025")

  let cleaned = await IntentLaneNotebookIndex.removeAll(name: name)
  check(cleaned == nil, "the test index is emptied before the run")

  let indexed = await IntentLaneNotebookIndex.index([entity, nested], name: name)
  check(indexed == nil, "generated entities are accepted by a real named index")

  let one = await IntentLaneNotebookIndex.remove(identifiers: ["id-receipts"], name: name)
  check(one == nil, "removing one exact identifier succeeds")

  let cleared = await IntentLaneNotebookIndex.removeAll(name: name)
  check(cleared == nil, "removing every entity of the type succeeds")

  let clearedAgain = await IntentLaneNotebookIndex.removeAll(name: name)
  check(clearedAgain == nil, "removing again on an empty index still succeeds")

  let removedUnknown = await IntentLaneNotebookIndex.remove(identifiers: ["id-invented"], name: name)
  check(removedUnknown == nil, "removing an identifier that was never indexed still succeeds")

  let refreshed = await IntentLaneNotebookIndex.index([entity], name: name)
  check(refreshed == nil, "a full refresh cycle of remove then index succeeds")

  let disposed = await IntentLaneNotebookIndex.removeAll(name: name)
  check(disposed == nil, "the test index is emptied again when the run ends")
}

try await run()

if failures == 0 {
  print("ALL INDEX TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
