import AppIntents
import Cocoa
import CoreSpotlight
import Foundation

// IntentLane FSNotes pilot — the application's own deletion path, against a real
// named Core Spotlight index.
//
// The earlier index suite proved the index API in isolation. It could not prove
// that a notebook leaving FSNotes takes its index entry with it, because it never
// loads FSNotes. This suite does, and the gap it closes is the one the campaign
// records: `indexSync` was certified while a deleted notebook stayed indexed.
//
// Nothing here is a stand-in. The storage is `Storage.shared()`, the notebook is a
// real `Project`, the funnel is the real `SidebarOutlineView.removeRows`, the source
// is the same `FSNotesNotebookSource` the intent handlers use, and the index is a
// real named index. The harness compiles the exact file list Xcode compiles, read
// from the project file, and runs under an isolated HOME so Storage's defaults and
// its trash directory stay in the sandbox.
//
// The red is a runtime failure, not a compile failure, because the wiring being
// missing is exactly the defect: `removeRows` never calls the sync, so the removed
// identifier is still tracked. A test that could not compile would prove less.

let indexName = "dev.memolabs.intentlane.fsnotes-pilot.notebook.deletion"

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

@available(macOS 27.0, *)
func waitUntil(_ condition: () -> Bool, timeout: TimeInterval = 10) async -> Bool {
  let deadline = Date().addingTimeInterval(timeout)
  while !condition() && Date() < deadline {
    try? await Task.sleep(nanoseconds: 50_000_000)
  }
  return condition()
}

@available(macOS 27.0, *)
@MainActor
func run() async {
  let storage = Storage.shared()
  let sandbox = URL(fileURLWithPath: ProcessInfo.processInfo.environment["HOME"] ?? NSTemporaryDirectory(), isDirectory: true)
  let root = sandbox.appendingPathComponent("notebooks", isDirectory: true)
  try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)

  let kept = Project(storage: storage, url: root.appendingPathComponent("Kept", isDirectory: true))
  let doomed = Project(storage: storage, url: root.appendingPathComponent("Doomed", isDirectory: true))
  for project in [kept, doomed] {
    try? FileManager.default.createDirectory(at: project.url, withIntermediateDirectories: true)
    storage.insertProject(project: project)
  }
  check(storage.getProjects().contains { $0.getMd5CheckSum() == doomed.getMd5CheckSum() },
        "the doomed notebook is in the real Storage")

  let sync = NotebookIndexSync(source: FSNotesNotebookSource(), indexName: indexName)
  IntentLaneNotebookIntegration.indexSync = sync
  _ = await IntentLaneNotebookIndex.removeAll(name: indexName)
  let seeded = await sync.synchronize()
  check(seeded == nil, "the real source's eligible notebooks are written to the named index")
  check(sync.indexedIdentifiers().contains(doomed.getMd5CheckSum()),
        "the sync tracks the doomed notebook before the deletion")

  let sidebar = SidebarOutlineView()
  sidebar.removeRows(projects: [doomed])

  check(!storage.getProjects().contains { $0.getMd5CheckSum() == doomed.getMd5CheckSum() },
        "the real funnel removed the notebook from the real Storage")
  check(storage.getProjects().contains { $0.getMd5CheckSum() == kept.getMd5CheckSum() },
        "and left the other notebook alone")

  // The funnel is synchronous and the index is not, so the wiring runs in a task.
  // Waiting is the honest way to read it: if the funnel never calls the sync, the
  // wait runs out and the check below fails, which is the defect this suite exists
  // to catch.
  let dropped = await waitUntil { !sync.indexedIdentifiers().contains(doomed.getMd5CheckSum()) }
  check(dropped, "removeRows made the sync drop the removed identifier")
  check(sync.indexedIdentifiers().contains(kept.getMd5CheckSum()),
        "and the identifier that stayed is still tracked")

  let reconciled = await sync.reconcile()
  check(reconciled == nil, "reconciling after the deletion succeeds")
  check(!sync.indexedIdentifiers().contains(doomed.getMd5CheckSum()),
        "and the removed identifier stays out after a reconcile")
  let eligibleNow = Set(eligibleNotebooks(from: await FSNotesNotebookSource().currentNotebooks()).map(\.id))
  check(Set(sync.indexedIdentifiers()) == eligibleNow,
        "after a reconcile the sync tracks exactly the eligible notebooks the source offers")
  check(eligibleNow.contains(kept.getMd5CheckSum()), "and that set includes the notebook that stayed")

  let repeated = await sync.notebookWasRemoved(id: doomed.getMd5CheckSum())
  check(repeated == nil, "removing the same identifier twice still succeeds")

  let unknown = await sync.notebookWasRemoved(id: "id-never-existed")
  check(unknown == nil, "removing an identifier that was never indexed still succeeds")

  _ = await IntentLaneNotebookIndex.removeAll(name: indexName)
}

if #available(macOS 27.0, *) {
  await run()
} else {
  print("SKIP macOS 27 is required")
}

if failures == 0 {
  print("ALL DELETION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
