import Foundation

// IntentLane LuLu pilot — the pure rules.
//
// Eligibility, decision matching and identifier lookup, tested directly with no
// AppIntents and no LuLu. These are the rules that decide what the system is
// allowed to see about somebody's firewall.
//
// The record type is the sensitive part of this pilot, so the field set is
// itself under test. LuLu's own canonical identifier is a filesystem path or a
// signing identity, and a record that grew a `path`, a `key`, an `endpoint` or a
// `csInfo` field would put a developer's home directory into a client report
// without a line of code saying so. The Mirror checks below go red the moment
// such a field appears, which is the only way that rule can be kept by a test
// rather than by a comment.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Fixtures

// A permanent user rule, the ordinary case.
let chrome = RuleRecord(id: "6C4C4C2E-0001", name: "Google Chrome", action: "allow")
// A permanent block rule, so a decision is not mistaken for a class.
let blocked = RuleRecord(id: "6C4C4C2E-0002", name: "Homebrew", action: "deny")
// Two rules with the same display name. A firewall plausibly has them, and a
// matcher that resolved by name would return both and open the wrong one.
let duplicate = RuleRecord(id: "6C4C4C2E-0003", name: "Google Chrome", action: "deny")

// A rule the user switched off. It stays in the list and stays addressable,
// because the application renders it in the disabled colour rather than dropping
// it, so this is source_disabled and not item_not_usable.
let switchedOff = RuleRecord(id: "6C4C4C2E-0004", name: "Slack", action: "allow", isDisabled: true)

// A rule whose expiration has passed, and a temporary rule whose process has
// exited. Both are item_not_usable: still listed, unable to act.
let expired = RuleRecord(id: "6C4C4C2E-0005", name: "Expired", action: "deny", hasExpired: true)
let orphaned = RuleRecord(id: "6C4C4C2E-0006", name: "Orphaned", action: "deny", processHasExited: true)

// A rule with no name. A person never chose it, and a blank title is the one
// thing Spotlight and Siri both render as nothing.
let nameless = RuleRecord(id: "6C4C4C2E-0007", name: "   ", action: "allow")

// A rule that is both switched off and expired. Two conditions apply and one
// record must be excluded once, not counted twice.
let bothOffAndExpired = RuleRecord(
  id: "6C4C4C2E-0008", name: "Both", action: "deny", isDisabled: true, hasExpired: true
)

let everything = [chrome, blocked, duplicate, switchedOff, expired, orphaned, nameless, bothOffAndExpired]
let eligible = [chrome, blocked, duplicate, switchedOff]

// MARK: - The record carries nothing forbidden

let storedFields = Mirror(reflecting: chrome).children.compactMap(\.label).sorted()
check(
  storedFields == ["action", "hasExpired", "id", "isDisabled", "name", "processHasExited"],
  "the record has exactly the six classified fields, so a path, a key, an endpoint or a signing organisation has nowhere to live"
)
check(!storedFields.contains { $0.lowercased().contains("path") }, "and no field is named after a path")
check(!storedFields.contains { $0.lowercased().contains("key") }, "and none is named after the application's canonical key")
check(!storedFields.contains { $0.lowercased().contains("endpoint") }, "and none is named after an endpoint")
check(!storedFields.contains { $0.lowercased().contains("cs") }, "and none is named after the code-signing info")

let described = String(describing: everything)
check(!described.contains("/Users/"), "no record renders a home directory, even in its debug description")
check(!described.contains("DevID"), "and none renders a signing identity")

// MARK: - Eligibility

check(chrome.isEligible, "a permanent enabled rule is eligible")
check(switchedOff.isEligible, "a rule the user switched off is still eligible, because the application still lists it")
check(!expired.isEligible, "a rule whose expiration has passed is not eligible, because it can no longer act")
check(!orphaned.isEligible, "a temporary rule whose process has gone is not eligible, for the same reason")
check(!nameless.isEligible, "a rule with no name is not eligible, because a person could never choose it")
check(!bothOffAndExpired.isEligible, "a rule that is both switched off and expired is excluded for the expiration alone")
check(
  eligibleRules(from: everything) == eligible,
  "eligibility keeps the source order and drops everything else"
)

// MARK: - Name matching

check(matches(chrome, term: "Google Chrome"), "an exact name matches")
check(matches(chrome, term: "google chrome"), "matching ignores case")
check(matches(chrome, term: "  Google Chrome  "), "surrounding whitespace is ignored")
check(!matches(chrome, term: "Google"), "a prefix does not match, because that would guess")
check(!matches(chrome, term: "Chrome"), "a suffix does not match either")
check(!matches(chrome, term: "Google Chrome Canary"), "a longer name does not match")
check(!matches(chrome, term: "Firefox"), "a different name does not match")
check(!matches(chrome, term: ""), "an empty term never matches")
check(!matches(chrome, term: "   "), "a blank term never matches")
check(!matches(nameless, term: "   "), "a nameless rule matches nothing, not even a blank term")
check(matches(switchedOff, term: "Slack"), "a switched-off rule still matches by name, because the application still lists it in the disabled colour")
check(matches(blocked, term: "Homebrew"), "a block rule matches its name like an allow rule does")

// `matches` deliberately does not consult eligibility. It is one pure name
// comparison, and the composition of the two is what the integration suite drives
// through the real resolver, because a core test that composed them would be
// testing a second copy of the resolver rather than the one that ships.

// MARK: - Identifier lookup

check(rule(withIdentifier: "6C4C4C2E-0001", in: everything)?.id == "6C4C4C2E-0001", "an eligible rule is found by its uuid")
check(rule(withIdentifier: "6C4C4C2E-0005", in: everything) == nil, "an expired rule is not found even when the identifier is exact")
check(rule(withIdentifier: "6C4C4C2E-0006", in: everything) == nil, "a rule whose process has gone is not found")
check(rule(withIdentifier: "6C4C4C2E-0007", in: everything) == nil, "a nameless rule is not found")
check(rule(withIdentifier: "invented", in: everything) == nil, "an unknown identifier finds nothing")
check(rule(withIdentifier: "6c4c4c2e-0001", in: everything) == nil, "an identifier is matched exactly, never case-folded")
check(rule(withIdentifier: "Google Chrome", in: everything) == nil, "a name is not an identifier, even when it is the display title")
check(
  rule(withIdentifier: "6C4C4C2E-0003", in: everything)?.action == "deny",
  "two rules sharing a name are told apart by their uuid, so the second resolves to its own decision"
)

// MARK: - What the classification predicted, and this is the check for it

// The classification said the object is named by `uuid` while the application
// names it by `key`, so the identifier has to survive the two things the
// application lets a person change. A rename is expressible here because `name`
// is a record field. A move is not expressible at all, and that is the stronger
// statement: there is no field in which the new location could be written, so it
// cannot reach the identifier.
let renamed = RuleRecord(id: chrome.id, name: "Google Chrome Canary", action: chrome.action)
check(rule(withIdentifier: chrome.id, in: [renamed])?.name == "Google Chrome Canary",
      "a rename changes what the person sees and leaves the uuid untouched")
check(rule(withIdentifier: chrome.id, in: [renamed])?.id == chrome.id,
      "and the identifier resolves to the same rule afterwards")

check(Mirror(reflecting: renamed).children.compactMap(\.label).sorted() == storedFields,
      "a move cannot change the identifier, because the record has no field in which a location could be written")

// MARK: - The decision is the only thing the subtitle carries

check(chrome.action == "allow", "an allow rule's decision is the word allow")
check(blocked.action == "deny", "a block rule's decision is the word deny")
check(!everything.contains { $0.action.contains("pid:") }, "no decision carries the process identifier the application puts in that cell")
check(!everything.contains { $0.action.contains("until:") }, "no decision carries the expiration the application puts in that cell")
check(!everything.contains { $0.action.contains("kids") }, "no decision carries the process-tree marker the application puts in that cell")

// The application composes all three of those into the value it renders in the
// rules table, and the seam has to read one of them to know what the decision is.
// Narrowing happens in the core, where a test can reach it, so that a fourth word
// cannot reach a subtitle by accident.
check(ruleDecision(isBlocking: true) == "deny", "a blocking rule narrows to the word deny")
check(ruleDecision(isBlocking: false) == "allow", "a non-blocking rule narrows to the word allow")
check(
  Set([ruleDecision(isBlocking: true), ruleDecision(isBlocking: false)]).count == 2,
  "and narrowing can produce exactly two words, so there is no third"
)

if failures == 0 {
  print("ALL CORE TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
