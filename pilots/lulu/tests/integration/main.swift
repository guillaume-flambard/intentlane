import AppIntents
import Foundation

// IntentLane LuLu pilot — integration tests.
//
// These compile the generated entities with the pilot's real eligibility filter,
// resolver, open path and search routing, then drive them with a fake rule source,
// a recording opener and a recording search surface. What is under test is
// production code: only the three LuLu seams, the daemon's rule list, the rules
// table and the filter box, are replaced.
//
// RuleIntegration.swift is deliberately absent from this compile. That is the
// split: the file that speaks Objective-C is not part of what these tests
// exercise, and that is the only way these run without the privileged helper.
//
// What this still cannot prove is left out on purpose: that the operating system
// resolves a spoken name to these entities, what Spotlight shows, and that a rule
// leaving the store takes its indexed entry with it. The first two are observed
// claims. The third cannot be driven at all on this application, because the
// removal happens inside the system extension.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Doubles

final class FakeRuleSource: IntentLaneRuleSource, @unchecked Sendable {
  var rules: [RuleRecord] = []
  func currentRules() async -> [RuleRecord] { rules }
}

final class RecordingOpener: IntentLaneRuleOpening, @unchecked Sendable {
  private(set) var opened: [String] = []
  func open(_ id: String) async { opened.append(id) }
}

@MainActor
final class RecordingSearchSurface: IntentLaneRuleSearchSurface, @unchecked Sendable {
  private(set) var terms: [String] = []
  func applySearch(_ term: String) { terms.append(term) }
}

// MARK: - Fixtures

let chrome = RuleRecord(id: "uuid-chrome", name: "Google Chrome", action: "allow")
let homebrew = RuleRecord(id: "uuid-homebrew", name: "Homebrew", action: "deny")

// A second rule with the display name of `chrome` and the opposite decision. A
// firewall can hold both, and it is the case that a name-keyed resolver would get
// wrong, so it is here rather than invented at the point of failure.
let chromeAlsoBlocked = RuleRecord(id: "uuid-chrome-2", name: "Google Chrome", action: "deny")

// Switched off. Still listed, still addressable, so still resolvable and openable.
let slack = RuleRecord(id: "uuid-slack", name: "Slack", action: "allow", isDisabled: true)

// item_not_usable: listed, unable to act.
let expired = RuleRecord(id: "uuid-expired", name: "Expired", action: "deny", hasExpired: true)
let orphaned = RuleRecord(id: "uuid-orphaned", name: "Orphaned", action: "deny", processHasExited: true)

// A rule with no name, which a person could never choose.
let nameless = RuleRecord(id: "uuid-nameless", name: "  ", action: "allow")

let allRules = [chrome, homebrew, chromeAlsoBlocked, slack, expired, orphaned, nameless]

func makeSource(_ rules: [RuleRecord]? = nil) -> FakeRuleSource {
  let source = FakeRuleSource()
  source.rules = rules ?? allRules
  return source
}

// MARK: - Resolver, by name

let resolver = IntentLaneRuleResolverImplementation(source: makeSource())

let exact = try await resolver.ruleEntities(matching: "Homebrew")
check(exact.map(\.id) == ["uuid-homebrew"], "an exact name resolves that one rule")
check(exact.first?.name == "Homebrew", "the rule name is what the person sees")
check(exact.first?.action == "deny", "and the decision is the subtitle")

check(try await resolver.ruleEntities(matching: "homebrew").map(\.id) == ["uuid-homebrew"],
      "matching a name ignores case")
check(try await resolver.ruleEntities(matching: "  Homebrew  ").map(\.id) == ["uuid-homebrew"],
      "and ignores surrounding whitespace")

// The near-miss half of the exact negative: a title that is close must resolve to
// nothing at all, never to a neighbour.
check(try await resolver.ruleEntities(matching: "Homebre").isEmpty, "a truncated name resolves nothing, because that would guess")
check(try await resolver.ruleEntities(matching: "Home").isEmpty, "a prefix resolves nothing either")
check(try await resolver.ruleEntities(matching: "Homebrew (x86_64)").isEmpty, "a longer name resolves nothing")
check(try await resolver.ruleEntities(matching: "invented").isEmpty, "an unknown name resolves nothing")
check(try await resolver.ruleEntities(matching: "").isEmpty, "a blank query resolves nothing, never everything")
check(try await resolver.ruleEntities(matching: "   ").isEmpty, "a whitespace query resolves nothing too")

// Two rules sharing a name resolve to both, and to exactly those two, because a
// spoken name cannot say which one it means. Neither is silently preferred.
let homonyms = try await resolver.ruleEntities(matching: "Google Chrome")
check(Set(homonyms.map(\.id)) == ["uuid-chrome", "uuid-chrome-2"],
      "two rules sharing a name resolve to both, and the resolver does not pick one")
check(Set(homonyms.map(\.action)) == ["allow", "deny"],
      "and the decision is what tells them apart in the result")

// A switched-off rule is a source condition, not an exclusion: the application
// lists it in the disabled colour, so hiding it would hide something the person
// can see in their own list.
check(try await resolver.ruleEntities(matching: "Slack").map(\.id) == ["uuid-slack"],
      "a rule the person switched off still resolves, because the application still lists it")

// item_not_usable, composed by the real resolver rather than re-implemented here.
check(try await resolver.ruleEntities(matching: "Expired").isEmpty, "an expired rule does not resolve, and its name leaks nothing")
check(try await resolver.ruleEntities(matching: "Orphaned").isEmpty, "a rule whose process has gone does not resolve")
check(try await resolver.ruleEntities(matching: "  ").isEmpty, "a nameless rule resolves nothing")

// MARK: - Resolver, by identifier

let byIdentifier = try await resolver.ruleEntities(for: ["uuid-homebrew", "uuid-expired", "uuid-orphaned", "uuid-nameless"])
check(byIdentifier.map(\.id) == ["uuid-homebrew"], "asking by uuid returns the usable one and drops the expired, the orphaned and the nameless")

check(try await resolver.ruleEntities(for: ["uuid-slack"]).map(\.id) == ["uuid-slack"],
      "a switched-off rule is still reachable by uuid, for the same reason it still resolves by name")
check(try await resolver.ruleEntities(for: ["invented"]).isEmpty, "an unknown uuid resolves nothing")
check(try await resolver.ruleEntities(for: []).isEmpty, "asking for no uuid resolves nothing, never everything")
check(try await resolver.ruleEntities(for: ["UUID-HOMEBREW"]).isEmpty, "a uuid is matched exactly, never case-folded")
check(try await resolver.ruleEntities(for: ["Homebrew"]).isEmpty, "a name is not a uuid, even when it is the display title")

// MARK: - Suggestions

let suggested = try await resolver.suggestedRuleEntities()
check(suggested.map(\.id) == ["uuid-chrome", "uuid-homebrew", "uuid-chrome-2", "uuid-slack"],
      "suggestions list the usable rules only, in the daemon's own order")

// MARK: - Nothing forbidden reaches an entity

let everything = (suggested + homonyms + byIdentifier + exact).map(String.init(describing:))
check(!everything.contains { $0.contains("/Users/") }, "no entity renders a home directory")
check(!everything.contains { $0.contains("DevID") }, "and none renders a signing identity")
check(!everything.contains { $0.contains("pid:") }, "and none renders a process identifier")
check(!everything.contains { $0.contains("until:") }, "and none renders an expiration")
check(suggested.allSatisfy { ($0.action ?? "").isEmpty || $0.action == "allow" || $0.action == "deny" },
      "every decision is one of the two words the classification cleared")

// MARK: - Open path

let opener = RecordingOpener()
let openHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: opener)
try await openHandler.perform(target: IntentLaneRuleEntity(id: "uuid-homebrew", name: "Homebrew", action: "deny"))
check(opener.opened == ["uuid-homebrew"], "opening a resolved rule calls the opening seam once with its exact uuid")
check(opener.opened.allSatisfy { !$0.contains("/") }, "and the value it passes on is a uuid, never a path")

// The exact negative. An identifier that does not exist must resolve to nothing,
// select no neighbour and open nothing.
let unknownOpener = RecordingOpener()
let unknownHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: unknownOpener)
do {
  try await unknownHandler.perform(target: IntentLaneRuleEntity(id: "invented", name: "Invented", action: "allow"))
  check(false, "opening an unknown uuid throws")
} catch {
  check(true, "opening an unknown uuid throws")
}
check(unknownOpener.opened.isEmpty, "and calls the opening seam zero times, selecting no neighbour")

// The other half, and the one a firewall can get wrong: a near-miss title must not
// open a different object. The target carries a title the store does not have.
let nearMissOpener = RecordingOpener()
let nearMissHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: nearMissOpener)
do {
  try await nearMissHandler.perform(target: IntentLaneRuleEntity(id: "invented", name: "Homebrew", action: "deny"))
  check(false, "an unknown uuid carrying a real rule's title throws rather than opening that rule")
} catch {
  check(true, "an unknown uuid carrying a real rule's title throws rather than opening that rule")
}
check(nearMissOpener.opened.isEmpty, "and the real rule is not selected in its place")

let expiredOpener = RecordingOpener()
let expiredHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: expiredOpener)
do {
  try await expiredHandler.perform(target: IntentLaneRuleEntity(id: "uuid-expired", name: "Expired", action: "deny"))
  check(false, "opening an expired uuid throws")
} catch {
  check(true, "opening an expired uuid throws")
}
check(expiredOpener.opened.isEmpty, "and performs no selection at all")

let orphanedOpener = RecordingOpener()
let orphanedHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: orphanedOpener)
do {
  try await orphanedHandler.perform(target: IntentLaneRuleEntity(id: "uuid-orphaned", name: "Orphaned", action: "deny"))
  check(false, "opening a uuid whose process has gone throws")
} catch {
  check(true, "opening a uuid whose process has gone throws")
}
check(orphanedOpener.opened.isEmpty, "and never selects it")

// The same-named neighbour: the target is the second Chrome and the opener must
// receive the second Chrome's uuid, not the first one's.
let homonymOpener = RecordingOpener()
let homonymHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: homonymOpener)
try await homonymHandler.perform(target: IntentLaneRuleEntity(id: "uuid-chrome-2", name: "Google Chrome", action: "deny"))
check(homonymOpener.opened == ["uuid-chrome-2"], "two rules sharing a name open by their own uuid, not by the first match")

let switchedOffOpener = RecordingOpener()
let switchedOffHandler = IntentLaneOpenRuleImplementation(source: makeSource(), opener: switchedOffOpener)
try await switchedOffHandler.perform(target: IntentLaneRuleEntity(id: "uuid-slack", name: "Slack", action: "allow"))
check(switchedOffOpener.opened == ["uuid-slack"], "a switched-off rule can still be opened, because the pilot does not change the firewall")

// MARK: - Search routing

let surface = await MainActor.run { RecordingSearchSurface() }
let searchHandler = IntentLaneSearchRulesImplementation(surface: surface)
try await searchHandler.perform(criteria: StringSearchCriteria(term: "Homebrew"))
check(await MainActor.run { surface.terms } == ["Homebrew"], "a system search request reaches the filter box with its term")
check(opener.opened == ["uuid-homebrew"], "and a search opens nothing, it routes the list")

let blankSurface = await MainActor.run { RecordingSearchSurface() }
let blankHandler = IntentLaneSearchRulesImplementation(surface: blankSurface)
try await blankHandler.perform(criteria: StringSearchCriteria(term: ""))
check(await MainActor.run { blankSurface.terms }.isEmpty, "a blank search term is not routed as a real term")

let paddedSurface = await MainActor.run { RecordingSearchSurface() }
let paddedHandler = IntentLaneSearchRulesImplementation(surface: paddedSurface)
try await paddedHandler.perform(criteria: StringSearchCriteria(term: "  Homebrew  "))
check(await MainActor.run { paddedSurface.terms } == ["Homebrew"], "a padded term reaches the filter box trimmed, because the box filters on the whole string")

// A search that matches nothing is still routed. The application is the one that
// shows an empty list; the pilot deciding otherwise would hide the box's own
// behaviour.
let emptySurface = await MainActor.run { RecordingSearchSurface() }
let emptyHandler = IntentLaneSearchRulesImplementation(surface: emptySurface)
try await emptyHandler.perform(criteria: StringSearchCriteria(term: "nothing matches this"))
check(await MainActor.run { emptySurface.terms } == ["nothing matches this"], "a term that matches no rule is still routed to the box")

if failures == 0 {
  print("ALL INTEGRATION TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
