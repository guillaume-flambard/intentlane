import Foundation

// IntentLane FSNotes pilot — the pure rules.
//
// Eligibility, name matching and identifier lookup, tested directly with no
// AppIntents and no FSNotes. These are the rules that decide what the system is
// allowed to see, so they are tested without a resolver in the way.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

let plain = NotebookRecord(id: "id-notes", title: "Notes", context: nil)
let encrypted = NotebookRecord(id: "id-enc", title: "Diary", context: nil, isEncrypted: true)
let trashed = NotebookRecord(id: "id-trash", title: "Trash", context: nil, isTrash: true)
let virtualItem = NotebookRecord(id: "id-all", title: "All Notes", context: nil, isVirtual: true)
let bookmark = NotebookRecord(id: "id-mark", title: "Shared", context: nil, isBookmark: true)
let nameless = NotebookRecord(id: "id-empty", title: "", context: nil)

let everything = [plain, encrypted, trashed, virtualItem, bookmark, nameless]

// MARK: - Eligibility

check(plain.isEligible, "a plain notebook is eligible")
check(!encrypted.isEligible, "an encrypted notebook is not eligible, locked or not")
check(!trashed.isEligible, "a trashed notebook is not eligible")
check(!virtualItem.isEligible, "a virtual notebook is not eligible, because the user did not create it")
check(!bookmark.isEligible, "a bookmark is not eligible, because it is a link and not a folder")
check(!nameless.isEligible, "a notebook with no name is not eligible, because it could never be chosen")
check(
  !NotebookRecord(id: "x", title: "x", context: nil, isEncrypted: true, isTrash: true).isEligible,
  "a notebook that is both encrypted and trashed is still only excluded once"
)

check(eligibleNotebooks(from: everything) == [plain], "eligibility keeps the source order and drops everything else")

// MARK: - Name matching

check(matches(plain, term: "Notes"), "an exact name matches")
check(matches(plain, term: "notes"), "matching ignores case")
check(matches(plain, term: "  Notes  "), "surrounding whitespace is ignored")
check(!matches(plain, term: "Note"), "a prefix does not match, because that would guess")
check(!matches(plain, term: "Notes and more"), "a longer name does not match")
check(!matches(plain, term: "Archives"), "a different name does not match")
check(!matches(plain, term: ""), "an empty term never matches")
check(!matches(plain, term: "   "), "a blank term never matches")
check(!matches(plain, term: "Notés"), "a diacritic change does not match, because the stored name is what is compared")
check(!matches(nameless, term: ""), "a nameless notebook never matches anything")

// MARK: - Identifier lookup

let pool = [plain, encrypted, trashed]

check(notebook(withIdentifier: "id-notes", in: pool)?.id == "id-notes", "an eligible notebook is found by its identifier")
check(notebook(withIdentifier: "id-enc", in: pool) == nil, "an encrypted notebook is not found even when the identifier is exact")
check(notebook(withIdentifier: "id-trash", in: pool) == nil, "a trashed notebook is not found either")
check(notebook(withIdentifier: "id-invented", in: pool) == nil, "an unknown identifier finds nothing")
check(notebook(withIdentifier: "ID-NOTES", in: pool) == nil, "an identifier is matched exactly, never case-folded")
check(notebook(withIdentifier: "Notes", in: pool) == nil, "a name is not an identifier")

if failures == 0 {
  print("ALL CORE TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
