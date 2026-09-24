import AppIntents
import CoreSpotlight
import Foundation

// IntentLane IINA pilot — index lifecycle tests against a real named Core Spotlight
// index. Compiled with the generated entities and the adapter's own index wrapper,
// so the calls under test are the production ones rather than a mock.
//
// App Intents in the macOS 27 SDK exposes no way to read a named index back: the
// only operations are indexAppEntities, deleteAppEntities(identifiedBy:ofType:)
// and deleteAppEntities(ofType:). These tests therefore prove that the real index
// accepts the pilot's entity type and the production call sequence. The rule about
// which entities belong in the index is proven by the pure mapping tests.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

let testIndexName = "dev.memolabs.intentlane.iina-pilot.tests.played_media"
let entity = IntentLanePlayedMediaEntity(id: "md5-test-aurora", title: "Aurora", kind: "Video")
let secondEntity = IntentLanePlayedMediaEntity(id: "md5-test-borealis", title: "Borealis", kind: "Video")

func attempt(_ body: () async throws -> Void) async -> Error? {
  do {
    try await body()
    return nil
  } catch {
    return error
  }
}

check(IntentLanePlayedMediaIntegration.indexName == "dev.memolabs.intentlane.iina-pilot.played_media",
      "the production index name is unchanged")

// 1. A clean slate, so a leftover from an earlier run cannot make this one pass.
let cleaned = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
check(cleaned == nil, "the test index is emptied before the run")

// 2. The generated entity type is accepted by a real named index.
let indexed = await attempt { try await IntentLanePlayedMediaIntegration.index([entity], name: testIndexName) }
check(indexed == nil, "a generated entity is accepted by a real named index")

// 3. The clear, recording-off and deleted-file paths all end in the same removal.
let cleared = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
check(cleared == nil, "removing every entity of the type succeeds")

// 4. The removal is idempotent, so an already empty index is not an error state.
let clearedAgain = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
check(clearedAgain == nil, "removing again on an empty index still succeeds")

// 5. A full refresh cycle, as the adapter performs it on every history change.
let refreshed = await attempt {
  try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName)
  try await IntentLanePlayedMediaIntegration.index([entity, secondEntity], name: testIndexName)
}
check(refreshed == nil, "a full refresh cycle of remove then index succeeds")

// 6. The test index is disposable, including on the failure path.
let disposed = await attempt { try await IntentLanePlayedMediaIntegration.removeAll(name: testIndexName) }
check(disposed == nil, "the test index is emptied again when the run ends")

if failures == 0 {
  print("ALL INDEX TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
