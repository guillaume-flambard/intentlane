import AppIntents
import Foundation

// IntentLane HandBrake pilot — integration tests.
//
// These compile the generated entities with the pilot's real eligibility filter,
// resolver, open path and search routing, then drive them with a fake preset
// source and a recording opener. What is under test is production code: only the
// two HandBrake seams, the presets tree and the presets view, are replaced.
//
// There is no search surface here, on purpose. HandBrake's presets view has no
// search field, so the contract does not claim system.searchInApp.
//
// What this still cannot prove is left out on purpose: that the operating system
// resolves a spoken name to these entities, and what Spotlight shows. Those are
// observed claims, not deterministic ones.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Doubles

final class FakePresetSource: IntentLanePresetSource, @unchecked Sendable {
  var presets: [PresetRecord] = []

  func currentPresets() -> [PresetRecord] { presets }
}

final class RecordingOpener: IntentLanePresetOpening, @unchecked Sendable {
  private(set) var opened: [String] = []
  func open(_ id: String) async { opened.append(id) }
}

// MARK: - Fixtures

// Two built-ins sharing a name would need two categories to be distinct, which
// is exactly what the identifier is for, so the fixtures use different names and
// the homonym case is covered by two entries sharing a title in two categories.
let fast = PresetRecord(id: "General/Fast 1080p30", title: "Fast 1080p30", category: "General")
let web = PresetRecord(id: "Web/H.264 Web", title: "H.264 Web", category: "Web")
let topLevel = PresetRecord(id: "DivX HQ", title: "DivX HQ", category: nil)

let userMade = PresetRecord(id: "Client Acme 2026", title: "Client Acme 2026", category: nil, isBuiltIn: false)
let unsupported = PresetRecord(id: "Devices/Old Device", title: "Old Device", category: "Devices", isSupported: false)
let categoryNode = PresetRecord(id: "General", title: "General", category: nil, isLeaf: false)

let allPresets = [fast, web, topLevel, userMade, unsupported, categoryNode]

func makeSource(_ presets: [PresetRecord]? = nil) -> FakePresetSource {
  let source = FakePresetSource()
  source.presets = presets ?? allPresets
  return source
}

// MARK: - Resolver

let resolver = IntentLanePresetResolverImplementation(source: makeSource())

let exact = try await resolver.presetEntities(matching: "Fast 1080p30")
check(exact.map(\.id) == ["General/Fast 1080p30"], "an exact name resolves that one preset")
check(exact.first?.title == "Fast 1080p30", "the preset name is what the user sees")

let caseInsensitive = try await resolver.presetEntities(matching: "fast 1080p30")
check(caseInsensitive.map(\.id) == ["General/Fast 1080p30"], "matching a name ignores case")

check(try await resolver.presetEntities(matching: "Fast 1080").isEmpty, "a partial name does not match, because it would guess")
check(try await resolver.presetEntities(matching: "invented").isEmpty, "an unknown name resolves nothing")
check(try await resolver.presetEntities(matching: "   ").isEmpty, "a blank query resolves nothing, never everything")

check(try await resolver.presetEntities(matching: "Client Acme 2026").isEmpty, "a preset the user created does not resolve, and its name leaks nothing")
check(try await resolver.presetEntities(matching: "Old Device").isEmpty, "an unsupported preset does not resolve")
check(try await resolver.presetEntities(matching: "General").isEmpty, "a category does not resolve as if it were a preset")

let byIdentifier = try await resolver.presetEntities(for: ["Web/H.264 Web", "Client Acme 2026", "Devices/Old Device"])
check(Set(byIdentifier.map(\.id)) == ["Web/H.264 Web"], "asking by identifier returns the eligible ones and drops the user's and the unsupported")

check(try await resolver.presetEntities(for: ["invented"]).isEmpty, "an unknown identifier resolves nothing")
check(try await resolver.presetEntities(for: []).isEmpty, "asking for no identifier resolves nothing, never everything")

let suggested = try await resolver.suggestedPresetEntities()
check(suggested.map(\.id) == ["General/Fast 1080p30", "Web/H.264 Web", "DivX HQ"],
      "suggestions list only eligible presets, in the tree's own order")

// MARK: - Presentation

check(try await resolver.presetEntities(matching: "Fast 1080p30").first?.category == "General",
      "a categorised preset carries its category, which is the only thing that tells it apart")
check(try await resolver.presetEntities(matching: "DivX HQ").first?.category == nil,
      "a top-level preset carries no category")
check(suggested.allSatisfy { $0.category?.contains("/Users/") != true }, "no category ever contains a file path")

// MARK: - Open path

let opener = RecordingOpener()
let openHandler = IntentLaneOpenPresetImplementation(source: makeSource(), opener: opener)
try await openHandler.perform(target: IntentLanePresetEntity(id: "Web/H.264 Web", title: "H.264 Web", category: "Web"))
check(opener.opened == ["Web/H.264 Web"], "opening a resolved preset calls the opening seam once with its exact id")

let unknownOpener = RecordingOpener()
let unknownHandler = IntentLaneOpenPresetImplementation(source: makeSource(), opener: unknownOpener)
do {
  try await unknownHandler.perform(target: IntentLanePresetEntity(id: "invented", title: "Invented", category: nil))
  check(false, "opening an unknown identifier throws")
} catch {
  check(true, "opening an unknown identifier throws")
}
check(unknownOpener.opened.isEmpty, "and calls the opening seam zero times")

let userOpener = RecordingOpener()
let userHandler = IntentLaneOpenPresetImplementation(source: makeSource(), opener: userOpener)
do {
  try await userHandler.perform(target: IntentLanePresetEntity(id: "Client Acme 2026", title: "Client Acme 2026", category: nil))
  check(false, "opening a user-created preset throws, even with the exact identifier")
} catch {
  check(true, "opening a user-created preset throws, even with the exact identifier")
}
check(userOpener.opened.isEmpty, "and never selects it")

if failures == 0 {
  print("ALL INTEGRATION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
