import Foundation

// IntentLane HandBrake pilot — the pure rules.
//
// Eligibility, name matching and identifier lookup, tested directly with no
// AppIntents and no HandBrake. These are the rules that decide what the system is
// allowed to see, so they are tested without a resolver in the way.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

let general = PresetRecord(id: "General/Fast 1080p30", title: "Fast 1080p30", category: "General")
let general1080 = PresetRecord(id: "General/Fast 1080p", title: "Fast 1080p", category: "General")
let web = PresetRecord(id: "Web/H.264 Web", title: "H.264 Web", category: "Web")
let userMade = PresetRecord(id: "Client Acme 2026", title: "Client Acme 2026", category: nil, isBuiltIn: false)
let unsupported = PresetRecord(id: "Devices/Old Device", title: "Old Device", category: "Devices", isSupported: false)
let categoryNode = PresetRecord(id: "General", title: "General", category: nil, isLeaf: false)

let everything = [general, general1080, web, userMade, unsupported, categoryNode]

// MARK: - Eligibility

check(general.isEligible, "a built-in preset is eligible")
check(!userMade.isEligible, "a preset the user created is not eligible, because its name is written by the person")
check(!unsupported.isEligible, "a preset the app marks unsupported is not eligible, because offering it would offer something that cannot run")
check(!categoryNode.isEligible, "a category is not a preset, so it is not eligible")
check(
  !PresetRecord(id: "x", title: "x", category: nil, isBuiltIn: false, isLeaf: false).isEligible,
  "a node that is neither built-in nor a leaf is excluded for both reasons at once"
)
check(eligiblePresets(from: everything) == [general, general1080, web], "eligibility keeps source order and drops everything else")

// MARK: - Name matching

check(matches(general, term: "Fast 1080p30"), "an exact name matches")
check(matches(general, term: "fast 1080p30"), "matching ignores case")
check(matches(general, term: "  Fast 1080p30  "), "surrounding whitespace is ignored")
check(!matches(general, term: "Fast 1080"), "a prefix does not match, because that would guess")
check(!matches(general, term: "Fast 1080p30 H.264"), "a longer name does not match")
check(!matches(general, term: "Very Fast 1080p30"), "a different name does not match")
check(!matches(general, term: ""), "an empty term never matches")
check(!matches(general, term: "   "), "a blank term never matches")
check(!matches(general, term: "Vite 1080p30"), "a diacritic change does not match, because the stored name is what is compared")
check(!matches(general, term: "General"), "a category name does not match, because a category is not a preset")

// MARK: - Identifier lookup

let pool = [general, general1080, web, userMade, unsupported, categoryNode]

check(preset(withIdentifier: "Web/H.264 Web", in: pool)?.id == "Web/H.264 Web", "an eligible preset is found by its identifier")
check(preset(withIdentifier: "Client Acme 2026", in: pool) == nil, "a user preset is not found even when the identifier is exact")
check(preset(withIdentifier: "Devices/Old Device", in: pool) == nil, "an unsupported preset is not found")
check(preset(withIdentifier: "General", in: pool) == nil, "a category is not found")
check(preset(withIdentifier: "H.264 Web", in: pool) == nil, "a bare name is not an identifier when the preset has a category")
check(preset(withIdentifier: "web/h.264 web", in: pool) == nil, "an identifier is matched exactly, never case-folded")
check(preset(withIdentifier: "General/Fast 1080p30", in: pool)?.title == "Fast 1080p30", "the identifier carries the path, the title stays clean")

if failures == 0 {
  print("ALL CORE TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
