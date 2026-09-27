import AppIntents
import CoreSpotlight
import Foundation

// IntentLane LuLu pilot — index lifecycle against a real named Core Spotlight
// index.
//
// Core Spotlight offers no read-back of a named index, so this cannot assert that
// a search finds a rule. What it can assert, and what matters here, is that the
// system accepts our generated entity in a real named index, that removal is
// idempotent, and that a full refresh cycle succeeds. The production index name is
// checked here so a rename cannot pass unnoticed.
//
// The second half is the part this application needs and the other two pilots
// proved differently. A rule leaving the store is `item_missing`, and the removal
// itself happens inside the privileged system extension, so no app-side test can
// cause it. What can be tested is the diff that follows it: the tracked set is
// what makes a removal provable rather than assumed, and it is checked across a
// disappearance that the test itself performs on the source.
//
// So this suite proves that a rule the application stopped offering is dropped
// from the index, and it does not prove that the application ever stops offering
// one. That second half is verified by review of `LuLu/Extension/Rules.m` and
// named as a limit in the pilot record.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

final class MutableRuleSource: IntentLaneRuleSource, @unchecked Sendable {
  var rules: [RuleRecord] = []
  func currentRules() async -> [RuleRecord] { rules }
}

@available(macOS 27.0, *)
func runIndexLifecycle() async throws {
  let name = "dev.memolabs.intentlane.lulu-pilot.rule.index-test"
  let chrome = IntentLaneRuleEntity(id: "uuid-chrome", name: "Google Chrome", action: "allow")
  let homebrew = IntentLaneRuleEntity(id: "uuid-homebrew", name: "Homebrew", action: "deny")

  check(
    IntentLaneRuleIndex.productionName == "dev.memolabs.intentlane.lulu-pilot.rule",
    "the production index name is the one the generated code uses"
  )

  let cleaned = await IntentLaneRuleIndex.removeAll(name: name)
  check(cleaned == nil, "the test index is emptied before the run")

  let indexed = await IntentLaneRuleIndex.index([chrome, homebrew], name: name)
  check(indexed == nil, "generated entities are accepted by a real named index")

  let one = await IntentLaneRuleIndex.remove(identifiers: ["uuid-homebrew"], name: name)
  check(one == nil, "removing one exact uuid succeeds")

  let cleared = await IntentLaneRuleIndex.removeAll(name: name)
  check(cleared == nil, "removing every entity of the type succeeds")

  let clearedAgain = await IntentLaneRuleIndex.removeAll(name: name)
  check(clearedAgain == nil, "removing again on an empty index still succeeds")

  let removedUnknown = await IntentLaneRuleIndex.remove(identifiers: ["uuid-invented"], name: name)
  check(removedUnknown == nil, "removing a uuid that was never indexed still succeeds")

  let refreshed = await IntentLaneRuleIndex.index([chrome], name: name)
  check(refreshed == nil, "a full refresh cycle of remove then index succeeds")

  let disposed = await IntentLaneRuleIndex.removeAll(name: name)
  check(disposed == nil, "the test index is emptied again when the run ends")
}

@available(macOS 27.0, *)
func runReconcileDiff() async throws {
  let name = "dev.memolabs.intentlane.lulu-pilot.rule.index-reconcile"
  _ = await IntentLaneRuleIndex.removeAll(name: name)

  let source = MutableRuleSource()
  let chrome = RuleRecord(id: "uuid-chrome", name: "Google Chrome", action: "allow")
  let homebrew = RuleRecord(id: "uuid-homebrew", name: "Homebrew", action: "deny")
  let slack = RuleRecord(id: "uuid-slack", name: "Slack", action: "allow", isDisabled: true)
  let expired = RuleRecord(id: "uuid-expired", name: "Expired", action: "deny", hasExpired: true)
  source.rules = [chrome, homebrew, slack, expired]

  let sync = RuleIndexSync(source: source, indexName: name)
  check(sync.indexedIdentifiers().isEmpty, "nothing is tracked before the first synchronize")

  let first = await sync.synchronize()
  check(first == nil, "the first synchronize succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-chrome", "uuid-homebrew", "uuid-slack"],
    "the tracked set is the usable rules only, so an expired rule is never indexed"
  )

  // The extension's three removals all look the same to the index: the daemon
  // stops offering the uuid. This is the disappearance, performed on the source.
  source.rules = [chrome, slack]
  let removed = await sync.reconcile()
  check(removed == nil, "reconcile after a rule disappeared succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-chrome", "uuid-slack"],
    "and the rule the daemon stopped offering is dropped from the tracked set"
  )

  // A rename must not look like a removal. This is the classification's prediction
  // made observable: the uuid is the identifier, so a person renaming a rule does
  // not orphan its index entry.
  let renamed = RuleRecord(id: homebrew.id, name: "Homebrew (Intel)", action: homebrew.action)
  source.rules = [chrome, slack, renamed]
  let afterRename = await sync.reconcile()
  check(afterRename == nil, "reconcile after a rename succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-chrome", "uuid-homebrew", "uuid-slack"],
    "and a rename is not mistaken for a removal, because the uuid did not change"
  )
  check(
    await IntentLaneRuleIndex.index([IntentLaneRuleEntity(id: renamed.id, name: renamed.name, action: renamed.action)], name: name) == nil,
    "and the renamed rule is indexable under the same uuid"
  )

  // A switched-off rule stays in the set. The application still lists it, in the
  // disabled colour, so dropping its entry would hide from Spotlight something the
  // person can see in their own window. The fixture toggles the flag and changes
  // nothing else, which is the only way this check can tell the two apart.
  let slackSwitchedOff = RuleRecord(id: slack.id, name: slack.name, action: slack.action, isDisabled: true)
  source.rules = [chrome, renamed, slackSwitchedOff]
  let switchedOff = await sync.reconcile()
  check(switchedOff == nil, "reconcile after a rule was switched off succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-chrome", "uuid-homebrew", "uuid-slack"],
    "and a switched-off rule stays tracked, because nothing about it disappeared from the store"
  )

  // Now take it out of the store for real, and the same rule leaves the set.
  source.rules = [chrome, renamed]
  let takenOut = await sync.reconcile()
  check(takenOut == nil, "reconcile after a rule was removed from the store succeeds")
  check(
    sync.indexedIdentifiers() == ["uuid-chrome", "uuid-homebrew"],
    "and the same rule leaves the set once it is gone, which is what tells the two apart"
  )

  let empty = await sync.reconcile()
  check(empty == nil, "reconcile with nothing left to remove still succeeds")

  _ = await IntentLaneRuleIndex.removeAll(name: name)
}

try await runIndexLifecycle()
try await runReconcileDiff()

if failures == 0 {
  print("ALL INDEX TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
