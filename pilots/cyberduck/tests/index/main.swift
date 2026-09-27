import AppIntents
import CoreSpotlight
import Foundation

// IntentLane Cyberduck pilot — index lifecycle against a real named Core Spotlight
// index, and the folder diff.
//
// Core Spotlight offers no read-back of a named index, so this cannot assert that a
// search finds a connection. What it can assert, and what matters here, is that the
// system accepts our generated entity in a real named index, that removal is
// idempotent, and that a full refresh cycle succeeds. The production index name is
// checked here so a rename cannot pass unnoticed.
//
// The second half is this application's version of what the other pilots proved with
// a deletion suite, and it is a different mechanism. A deleted connection is a file
// that is gone, so there is nothing to drive: the pilot writes real `.duck` files
// into a real folder and removes them, and `application_openFile` is the path the
// removal would have come through. That is a stronger position than a deletion suite
// in one respect, because the object under test is the application's own file, and a
// weaker one in another, because no application code runs to delete it.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

@available(macOS 27.0, *)
func run() async throws {
  let name = "dev.memolabs.intentlane.cyberduck-pilot.connection.index-test"
  let production = IntentLaneConnectionEntity(id: "uuid-production", nickname: "Acme production")
  let staging = IntentLaneConnectionEntity(id: "uuid-staging", nickname: "Acme staging")

  check(
    IntentLaneConnectionIndex.productionName == "dev.memolabs.intentlane.cyberduck-pilot.connection",
    "the production index name is the one the generated code uses"
  )

  let cleaned = await IntentLaneConnectionIndex.removeAll(name: name)
  check(cleaned == nil, "the test index is emptied before the run")

  let indexed = await IntentLaneConnectionIndex.index([production, staging], name: name)
  check(indexed == nil, "generated entities are accepted by a real named index")

  let one = await IntentLaneConnectionIndex.remove(identifiers: ["uuid-staging"], name: name)
  check(one == nil, "removing one exact UUID succeeds")

  let cleared = await IntentLaneConnectionIndex.removeAll(name: name)
  check(cleared == nil, "removing every entity of the type succeeds")

  let clearedAgain = await IntentLaneConnectionIndex.removeAll(name: name)
  check(clearedAgain == nil, "removing again on an empty index still succeeds")

  let removedUnknown = await IntentLaneConnectionIndex.remove(identifiers: ["uuid-invented"], name: name)
  check(removedUnknown == nil, "removing a UUID that was never indexed still succeeds")

  let refreshed = await IntentLaneConnectionIndex.index([production], name: name)
  check(refreshed == nil, "a full refresh cycle of remove then index succeeds")

  let disposed = await IntentLaneConnectionIndex.removeAll(name: name)
  check(disposed == nil, "the test index is emptied again when the run ends")
}

// The folder diff, which is this application's version of a deletion suite. A deleted
// connection is a file that is gone, so the test removes a real `.duck` file and
// watches the tracked set, which is the only record of what was indexed because Core
// Spotlight has no read-back for a named index.
@available(macOS 27.0, *)
func runFolderDiff() async throws {
  let name = "dev.memolabs.intentlane.cyberduck-pilot.connection.index-diff"
  _ = await IntentLaneConnectionIndex.removeAll(name: name)

  let folder = FileManager.default.temporaryDirectory
    .appendingPathComponent("intentlane-cyberduck-index", isDirectory: true)
  try? FileManager.default.removeItem(at: folder)
  try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
  defer { try? FileManager.default.removeItem(at: folder) }

  func write(_ uuid: String, _ nickname: String?) throws {
    var dict: [String: Any] = ["Protocol": "sftp", "UUID": uuid, "Hostname": "client.acme.example", "Port": "22"]
    if let nickname { dict["Nickname"] = nickname }
    let data = try PropertyListSerialization.data(fromPropertyList: dict, format: .xml, options: 0)
    try data.write(to: folder.appendingPathComponent("\(uuid).duck"))
  }

  try write("uuid-production", "Acme production")
  try write("uuid-staging", "Acme staging")
  try write("uuid-nameless", nil)

  let sync = ConnectionIndexSync(folder: folder, indexName: name)
  check(sync.indexedIdentifiers().isEmpty, "nothing is tracked before the first synchronize")

  check(await sync.synchronize() == nil, "the first synchronize succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-production", "uuid-staging"],
    "the tracked set is the readable, well-formed, nicknamed bookmarks, and the nameless one is not indexed"
  )

  // A rename, which is the same file with a different UUID inside. The store writes
  // the UUID into the file, so this is a new identity wearing the old file's name,
  // and the file name disagreeing with the UUID is exactly the `mismatched` case.
  try write("uuid-staging", "Acme staging EU")
  check(await sync.synchronize() == nil, "a synchronize after a nickname change succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-production", "uuid-staging"],
    "and a nickname change is not a removal, because the UUID did not change"
  )

  // The real removal: the file is gone.
  try FileManager.default.removeItem(at: folder.appendingPathComponent("uuid-staging.duck"))
  check(await sync.synchronize() == nil, "a synchronize after a connection was deleted succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-production"],
    "and the deleted connection leaves the tracked set, which is what item_missing means here"
  )

  // A file that is there and cannot be read must not empty the set, and must not
  // throw. None of the three exposure rules covers "unreadable", so this is the
  // behaviour the pilot chose and the gap the contract names.
  try Data("not a plist".utf8).write(to: folder.appendingPathComponent("broken.duck"))
  check(await sync.synchronize() == nil, "a synchronize with an unreadable file in the folder still succeeds")
  check(sync.indexedIdentifiers() == ["uuid-production"], "and the unreadable file changes nothing")

  try write("uuid-edge", "Acme edge")
  check(await sync.synchronize() == nil, "a synchronize after a connection was added succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-edge", "uuid-production"],
    "and the new connection joins the set"
  )

  _ = await IntentLaneConnectionIndex.removeAll(name: name)
}

try await run()
try await runFolderDiff()

if failures == 0 {
  print("ALL INDEX TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
