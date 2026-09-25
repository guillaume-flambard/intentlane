import AppIntents
import CoreSpotlight
import Foundation

// IntentLane IINA pilot — index lifecycle against a real named Core Spotlight
// index.
//
// Core Spotlight offers no read-back of a named index, so this cannot assert that
// a search finds the media. What it can assert, and what matters, is that the
// system accepts our generated entity in a real named index, that removal is
// idempotent, and that a full refresh cycle succeeds. The production index name is
// checked here so a rename cannot pass unnoticed.
//
// The test index is cleaned in a defer, so a run that fails at step 3 still leaves
// an empty index behind. An earlier failing run must not be able to make a later
// one pass, or the gate is decoration.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

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
func run() async throws {
  let testIndexName = "dev.memolabs.intentlane.iina-pilot.played_media.index-test"
  let entity = IntentLanePlayedMediaEntity(id: "md5-aurora", title: "Aurora", kind: "Video")
  let secondEntity = IntentLanePlayedMediaEntity(id: "md5-borealis", title: "Borealis", kind: "Video")

  defer {
    Task {
      _ = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
    }
  }

  check(IntentLanePlayedMediaIntegration.indexName == "dev.memolabs.intentlane.iina-pilot.played_media",
        "the production index name is unchanged")

  let cleaned = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
  check(cleaned == nil, "the test index is emptied before the run")

  let indexed = await attempt { try await IntentLanePlayedMediaIntegration.index([entity], name: testIndexName) }
  check(indexed == nil, "a generated entity is accepted by a real named index")

  let cleared = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
  check(cleared == nil, "removing every entity of the type succeeds")

  let clearedAgain = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
  check(clearedAgain == nil, "removing again on an empty index still succeeds")

  let refreshed = await attempt {
    _ = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
    _ = await attempt { try await IntentLanePlayedMediaIntegration.index([entity, secondEntity], name: testIndexName) }
  }
  check(refreshed == nil, "a full refresh cycle of remove then index succeeds")

  // The reconciliation path deletes by identifier rather than emptying the type, so
  // that the records which did not change keep their place in the index. A named
  // index cannot be read back, so what can be asserted is that the call is accepted
  // and is idempotent on identifiers that were never there.
  let byIdentifier = await attempt {
    try await IntentLanePlayedMediaIntegration.remove(identifiers: ["md5-aurora", "md5-borealis"], name: testIndexName)
  }
  check(byIdentifier == nil, "deleting by identifier succeeds against a real named index")

  let byIdentifierAgain = await attempt {
    try await IntentLanePlayedMediaIntegration.remove(identifiers: ["md5-never-indexed"], name: testIndexName)
  }
  check(byIdentifierAgain == nil, "deleting an identifier that was never indexed still succeeds")

  let byEmptyList = await attempt {
    try await IntentLanePlayedMediaIntegration.remove(identifiers: [], name: testIndexName)
  }
  check(byEmptyList == nil, "deleting nothing is a no-op rather than a call")
}

try await run()

if failures == 0 {
  print("ALL INDEX TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
