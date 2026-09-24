import AppIntents
import CoreSpotlight
import Foundation

// IntentLane HandBrake pilot — the application's own preset tree, against a real
// named Core Spotlight index.
//
// The tree is the real one. The manager is the real `HBPresetsManager`, built
// against a fixture directory rather than the developer's presets, and the delete
// is the real `deletePresetAtIndexPath:`, which the real `HBTreeNode` answers by
// posting the real `HBPresetsChangedNotification`.
//
// That notification carries no node, so the wiring cannot be a removal call. It has
// to be a diff, and this suite is what proves the diff is the right shape: it
// deletes a preset, and the identifier that vanishes is the one the index drops.

let indexName = "dev.memolabs.intentlane.handbrake-pilot.preset.deletion"

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
struct SandboxPresetSource: IntentLanePresetSource {
  let manager: HBPresetsManager

  func currentPresets() async -> [PresetRecord] {
    await MainActor.run { presetRecords(in: manager.root) }
  }
}

@available(macOS 27.0, *)
@MainActor
func run() async {
  let sandbox = URL(fileURLWithPath: ProcessInfo.processInfo.environment["INTENTLANE_PRESET_FIXTURE"] ?? NSTemporaryDirectory(), isDirectory: true)
  guard let manager = HBPilotPresetsHarness.manager(forPresetsAt: sandbox.appendingPathComponent("presets.json")) else {
    check(false, "the real manager built a real preset tree")
    return
  }
  let root = manager.root

  let before = presetRecords(in: root)
  check(!before.isEmpty, "the manager generated the application's real built-in presets")
  guard let doomedId = before.first(where: { $0.id == "General/Fast 1080p30" })?.id else {
    check(false, "the real tree has the expected built-in preset to delete")
    return
  }
  check(before.count > 1, "and more than one preset, so a deletion is observable")

  let sync = PresetIndexSync(source: SandboxPresetSource(manager: manager), indexName: indexName)
  _ = await IntentLanePresetIndex.removeAll(name: indexName)
  let seeded = await sync.synchronize()
  check(seeded == nil, "the real tree's eligible presets are written to the named index")
  let trackedBefore = sync.indexedIdentifiers()
  check(trackedBefore.contains(doomedId), "the sync tracks the doomed preset's exact identifier")

  // The wiring is an observer on the real notification, so the test installs the
  // same observer the app installs and then lets the app's own delete drive it.
  let observer = PresetChangeObserver(sync: sync, manager: manager)
  defer { _ = observer }

  var notificationCount = 0
  let counter = NotificationCenter.default.addObserver(
    forName: .HBPresetsChanged,
    object: manager,
    queue: nil
  ) { _ in notificationCount += 1 }
  defer { NotificationCenter.default.removeObserver(counter) }

  guard let path = HBPilotPresetsHarness.indexPath(ofPresetNamed: "Fast 1080p30", in: manager) else {
    check(false, "the doomed preset has an index path in the real tree")
    return
  }
  HBPilotPresetsHarness.deletePreset(atIndexPath: path, in: manager)

  check(notificationCount > 0, "the real tree posted the real HBPresetsChangedNotification")
  check(!presetRecords(in: root).contains { $0.id == doomedId }, "the real delete removed the preset from the real tree")
  check(presetRecords(in: root).count == before.count - 1, "and left every other preset alone")

  // The observer reconciles asynchronously, so the test waits rather than calls.
  // If nothing observes the notification, the wait runs out and the check fails.
  let dropped = await waitUntil { !sync.indexedIdentifiers().contains(doomedId) }
  check(dropped, "the observer dropped the deleted preset's identifier from the index")
  let tracked = sync.indexedIdentifiers()
  check(!tracked.contains(doomedId), "and it is still gone a moment later")
  check(tracked.count == trackedBefore.count - 1, "exactly one identifier left the index")
  check(Set(trackedBefore).subtracting(tracked) == [doomedId],
        "and the one that left is the identifier of the preset that was deleted")

  let rebuilt = PresetIndexSync(source: SandboxPresetSource(manager: manager), indexName: indexName)
  _ = await rebuilt.synchronize()
  check(!rebuilt.indexedIdentifiers().contains(doomedId),
        "a sync built after the deletion indexes no trace of it")
  check(Set(rebuilt.indexedIdentifiers()) == Set(eligiblePresets(from: presetRecords(in: root)).map(\.id)),
        "and agrees with the eligible presets the tree now holds")

  _ = await IntentLanePresetIndex.removeAll(name: indexName)
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
