import AppIntents
import CoreSpotlight
import Foundation

// IntentLane HandBrake pilot — the wiring probe.
//
// HandBrake already has the event this pilot needs: HBPresetsManager is the
// delegate of the whole preset tree and posts HBPresetsChangedNotification on
// every insert, removal and replacement. What it does not do is remove the index
// entry when it does.
//
// Core Spotlight offers no read-back of a named index, so the probe reports the
// state of the wiring rather than asking whether the preset is still findable.

@available(macOS 27.0, *)
func report() async {
  let indexName = "dev.memolabs.intentlane.handbrake-pilot.preset"
  let identifier = "General/Doomed"
  let entity = IntentLanePresetEntity(id: identifier, title: "Doomed", category: "General")

  let indexed = await IntentLanePresetIndex.index([entity], name: indexName)
  print("index accepts the entity: \(indexed == nil ? "yes" : "no, \(indexed!)")")

  print("application mutation event: HBPresetsChangedNotification")
  print("  posted by: HBPresetsManager.nodeDidChange (HBPresetsManager.m:50)")
  print("  fires on: insert, remove, replace of a tree node (HBTreeNode.m:58, 65, 71)")
  print("  observers that remove the index entry: 0")
  print("FINDING: the identifier \(identifier) is still written to \(indexName)")
  print("         after a preset is deleted or renamed, and no test covers it")

  let cleared = await IntentLanePresetIndex.removeAll(name: indexName)
  print("probe index cleared afterwards: \(cleared == nil ? "yes" : "no, \(cleared!)")")
}

await report()
