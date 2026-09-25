import Foundation

// IntentLane IINA pilot — business tests for the pure PlayedMedia core.
// Compiled with PlayedMediaCore.swift and run as a standalone executable, so no
// IINA build and no test target are needed. See run-core-tests.sh.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

let now = Date()
func input(_ name: String, title: String?, md5: String, ext: String) -> PlayedMediaInput {
  PlayedMediaInput(
    url: URL(fileURLWithPath: "/private/tmp/iina-fixtures/\(name).\(ext)"),
    name: name,
    title: title,
    mpvMd5: md5,
    addedDate: now
  )
}

// 1. Mapping to a display/index-safe record, without exposing paths.
let aurora = PlayedMediaCore.record(from: input("Aurora", title: "Aurora", md5: "md5-aurora", ext: "mp4"))
check(aurora.id == "md5-aurora", "identifier is the stable hash, not a path")
check(aurora.title == "Aurora", "stored title wins")
check(aurora.kind == "Video", "kind derived from the extension")
check(!aurora.id.contains("/") && !aurora.title.contains("/") && !aurora.kind.contains("/"), "no path in id, title or kind")

let borealis = PlayedMediaCore.record(from: input("Borealis", title: nil, md5: "md5-borealis", ext: "mkv"))
check(borealis.title == "Borealis", "file basename used when no stored title")
check(PlayedMediaCore.mediaKind(for: URL(fileURLWithPath: "/x/song.mp3")) == "Audio", "audio kind from extension")

// 2. Resolution: exact, ambiguous (homonyms), missing, blank, diacritics.
let aurora2 = PlayedMediaCore.record(from: input("Aurora", title: "Aurora", md5: "md5-aurora-2", ext: "mov"))
let records = [aurora, borealis, aurora2]
check(PlayedMediaCore.matches(records, query: "aurora").count == 2, "ambiguous title returns both homonyms")
check(PlayedMediaCore.matches(records, query: "AURORA").count == 2, "match is case-insensitive")
check(PlayedMediaCore.matches(records, query: "borealis").count == 1, "exact title resolves one record")
check(PlayedMediaCore.matches(records, query: "invented").isEmpty, "missing title returns zero")
check(PlayedMediaCore.matches(records, query: "   ").isEmpty, "blank query returns zero, never everything")

let cygnus = PlayedMediaCore.record(from: input("Cygnus", title: "Cygne etoile", md5: "md5-cygnus", ext: "mp4"))
check(PlayedMediaCore.matches([cygnus], query: "cygne étoilé").count == 1, "match is diacritic-insensitive")

// 3. Openability: a deleted file is never openable, and is never substituted.
check(PlayedMediaCore.isOpenable(aurora, fileExists: { _ in true }), "an existing file is openable")
check(!PlayedMediaCore.isOpenable(aurora, fileExists: { _ in false }), "a deleted file is not openable")

// 4. Shared history-to-record mapping: one rule for the resolver, the open path
// and the index refresh, so the three can never disagree.
let historyInputs = [
  input("Aurora", title: "Aurora", md5: "md5-aurora", ext: "mp4"),
  input("Borealis", title: nil, md5: "md5-borealis", ext: "mkv"),
  input("Cygnus", title: "Cygne etoile", md5: "md5-cygnus", ext: "mp4"),
]
let allPresent = PlayedMediaCore.records(from: historyInputs, access: PlayedMediaAccess(recordingEnabled: true, fileExists: { _ in true }))
check(allPresent.map(\.id) == ["md5-aurora", "md5-borealis", "md5-cygnus"],
      "shared mapping keeps history order and every identifier")
check(allPresent == historyInputs.map { PlayedMediaCore.record(from: $0) },
      "shared mapping is exactly record(from:) per entry, with no second rule")
check(PlayedMediaCore.records(from: historyInputs, access: PlayedMediaAccess(recordingEnabled: true, fileExists: { $0.lastPathComponent != "Cygnus.mp4" })).map(\.id)
      == ["md5-aurora", "md5-borealis"],
      "a record whose file disappeared is not offered")
check(PlayedMediaCore.records(from: [], access: PlayedMediaAccess(recordingEnabled: true, fileExists: { _ in true })).isEmpty,
      "cleared history maps to zero records")

// 5. Open path: the seam is called once with the exact record URL, and never
// called for an unknown identifier, a deleted file, or recording switched off.
final class RecordingPlayer: IINAPlaybackOpening {
  private(set) var opened: [URL] = []
  func open(_ url: URL) { opened.append(url) }
}

func openAttempt(identifier: String, inputs: [PlayedMediaInput], recordingEnabled: Bool = true,
                 fileExists: @escaping (URL) -> Bool = { _ in true },
                 player: RecordingPlayer) -> Result<URL, Error> {
  do {
    return .success(try PlayedMediaOpen.perform(identifier: identifier, inputs: inputs,
                                                access: PlayedMediaAccess(recordingEnabled: recordingEnabled,
                                                                          fileExists: fileExists),
                                                player: player))
  } catch {
    return .failure(error)
  }
}

let openInputs = [
  input("Aurora", title: "Aurora", md5: "md5-aurora", ext: "mp4"),
  input("Borealis", title: nil, md5: "md5-borealis", ext: "mkv"),
]
let validPlayer = RecordingPlayer()
if case .success(let url) = openAttempt(identifier: "md5-aurora", inputs: openInputs, player: validPlayer),
   url == openInputs[0].url {
  check(true, "a valid resolved record opens its exact URL")
} else {
  check(false, "a valid resolved record opens its exact URL")
}
check(validPlayer.opened == [openInputs[0].url], "a valid resolved record calls the seam exactly once")

let unknownPlayer = RecordingPlayer()
if case .failure = openAttempt(identifier: "md5-invented", inputs: openInputs, player: unknownPlayer) {
  check(true, "an unknown identifier throws")
} else {
  check(false, "an unknown identifier throws")
}
check(unknownPlayer.opened.isEmpty, "an unknown identifier performs zero calls")

let deletedPlayer = RecordingPlayer()
if case .failure = openAttempt(identifier: "md5-borealis", inputs: openInputs,
                               fileExists: { $0.lastPathComponent != "Borealis.mkv" }, player: deletedPlayer) {
  check(true, "a record whose file disappeared throws")
} else {
  check(false, "a record whose file disappeared throws")
}
check(deletedPlayer.opened.isEmpty, "a deleted file performs zero calls, with no substitute")

let disabledPlayer = RecordingPlayer()
if case .failure = openAttempt(identifier: "md5-aurora", inputs: openInputs,
                               recordingEnabled: false, player: disabledPlayer) {
  check(true, "an open request while recording is off throws")
} else {
  check(false, "an open request while recording is off throws")
}
check(disabledPlayer.opened.isEmpty, "recording off performs zero calls")

// 6. Identifier envelope, as decided: opaque, stable for the same canonical URL
// and across a title change, and explicitly not stable across a move.
let now2 = Date()
func atPath(_ path: String, title: String?, md5: String) -> PlayedMediaInput {
  PlayedMediaInput(url: URL(fileURLWithPath: path), name: "Aurora", title: title, mpvMd5: md5, addedDate: now2)
}
let original = atPath("/private/tmp/fixtures/Aurora.mp4", title: "Aurora", md5: "hash-at-original-path")
let retitled = atPath("/private/tmp/fixtures/Aurora.mp4", title: "Aurora remastered", md5: "hash-at-original-path")
let moved = atPath("/private/tmp/other/Aurora.mp4", title: "Aurora", md5: "hash-after-move")
check(PlayedMediaCore.identifier(for: retitled) == PlayedMediaCore.identifier(for: original),
      "the identifier survives a title change")
check(PlayedMediaCore.identifier(for: original) == "hash-at-original-path",
      "the identifier is the hash IINA computed for the canonical URL")
check(PlayedMediaCore.identifier(for: moved) != PlayedMediaCore.identifier(for: original),
      "a moved file gets a different identifier, as documented")
check(!PlayedMediaCore.identifier(for: moved).contains("/") && !PlayedMediaCore.identifier(for: original).contains("/"),
      "the identifier never exposes the path in reversible form")

let movePlayer = RecordingPlayer()
let moveInputs = [moved]
if case .success = openAttempt(identifier: "hash-at-original-path", inputs: moveInputs, player: movePlayer) {
  check(false, "the pre-move identifier no longer opens anything after a move")
} else {
  check(true, "the pre-move identifier no longer opens anything after a move")
}
check(movePlayer.opened.isEmpty, "a moved file is never substituted for the one that moved")
if case .success = openAttempt(identifier: "hash-after-move", inputs: moveInputs, player: movePlayer) {
  check(movePlayer.opened == [moved.url], "the new identifier opens the moved file exactly once")
} else {
  check(false, "the new identifier opens the moved file exactly once")
}

// 7. Subtitle decision: the subtitle is the media kind, and never the date.
let playedLongAgo = PlayedMediaInput(
  url: URL(fileURLWithPath: "/private/tmp/fixtures/Aurora.mp4"),
  name: "Aurora", title: "Aurora", mpvMd5: "md5-aurora", addedDate: Date(timeIntervalSince1970: 0)
)
let playedRecently = PlayedMediaInput(
  url: URL(fileURLWithPath: "/private/tmp/fixtures/Aurora.mp4"),
  name: "Aurora", title: "Aurora", mpvMd5: "md5-aurora", addedDate: Date(timeIntervalSince1970: 1_700_000_000)
)
check(PlayedMediaCore.subtitle(for: PlayedMediaCore.record(from: playedLongAgo)) == "Video",
      "the subtitle is the media kind")
check(PlayedMediaCore.subtitle(for: PlayedMediaCore.record(from: playedLongAgo))
      == PlayedMediaCore.subtitle(for: PlayedMediaCore.record(from: playedRecently)),
      "the subtitle does not change with the last-played date")
check(!PlayedMediaCore.subtitle(for: PlayedMediaCore.record(from: playedLongAgo)).contains("/"),
      "the subtitle carries no filesystem path")

if failures == 0 {
  print("ALL CORE TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}

// 8. verifierAcces, as a named operation rather than a rule inlined in two places.
// Exposing one media item and exposing every media item are two different offers,
// so the exclusion is one decision with a name, and a test has to be able to ask
// for a refusal instead of inferring one from an empty result.
let accessOn = PlayedMediaAccess(recordingEnabled: true, fileExists: { _ in true })
let accessOff = PlayedMediaAccess(recordingEnabled: false, fileExists: { _ in true })
let accessDeleted = PlayedMediaAccess(recordingEnabled: true, fileExists: { _ in false })

check(accessOn.allows(aurora), "a recorded item with its file present is allowed")
check(!accessOff.allows(aurora), "an item is refused while history recording is off")
check(!accessDeleted.allows(aurora), "an item whose file disappeared is refused")
if case .refused = accessOff.decision(for: aurora) {
  check(true, "a refusal is a refusal, not an empty result")
} else {
  check(false, "a refusal is a refusal, not an empty result")
}

if case .granted = accessOn.decision(for: aurora) {
  check(true, "the decision reports a grant when access is allowed")
} else {
  check(false, "the decision reports a grant when access is allowed")
}

if case .refused(let refusal) = accessOff.decision(for: aurora) {
  check(refusal.reason.lowercased().contains("recording"), "the refusal says which rule refused")
} else {
  check(false, "the decision reports a refusal when recording is off")
}

if case .refused(let refusal) = accessDeleted.decision(for: aurora) {
  check(refusal.reason.lowercased().contains("file"), "a missing file is named as the reason")
} else {
  check(false, "the decision reports a refusal when the file is gone")
}

check(PlayedMediaCore.records(from: openInputs, access: accessDeleted).isEmpty,
      "the shared mapping uses the same access decision, so it cannot disagree with open")
check(PlayedMediaCore.records(from: openInputs, access: accessOn).count == openInputs.count,
      "an allowed set is returned whole")
check(PlayedMediaCore.records(from: openInputs, access: accessOff).isEmpty,
      "nothing is exposed while recording is off")

// 9. Reconciliation. Core Spotlight offers no read-back of a named index, so the
// adapter cannot ask what is in there. It can only remember what it published. The
// diff is therefore computed against that memory, and a record that did not change
// is not written again, because rewriting the whole index on every history event
// costs a full reindex for nothing.
let unchangedSet = [aurora, borealis]
let sameDiff = PlayedMediaIndexReconcile.diff(previous: unchangedSet, current: unchangedSet)
check(sameDiff.added.isEmpty, "nothing is re-indexed when the history did not change")
check(sameDiff.removed.isEmpty, "nothing is deleted when the history did not change")
check(sameDiff.unchanged.count == 2, "both records are recognised as unchanged")

let removalDiff = PlayedMediaIndexReconcile.diff(previous: unchangedSet, current: [aurora])
check(removalDiff.removed == ["md5-borealis"], "a record that left the history is deleted by identifier")
check(removalDiff.added.isEmpty, "removing one record adds nothing")
check(removalDiff.unchanged.map(\.id) == ["md5-aurora"], "the record that stayed is not rewritten")

let addDiff = PlayedMediaIndexReconcile.diff(previous: unchangedSet, current: [aurora, borealis, cygnus])
check(addDiff.added.map(\.id) == ["md5-cygnus"], "a new record is indexed")
check(addDiff.removed.isEmpty, "adding a record deletes nothing")
check(addDiff.unchanged.count == 2, "the records that stayed are not rewritten")

let retitledAurora = PlayedMediaCore.record(from: input("Aurora", title: "Aurora remastered", md5: "md5-aurora", ext: "mp4"))
let retitleDiff = PlayedMediaIndexReconcile.diff(previous: unchangedSet, current: [retitledAurora, borealis])
check(retitleDiff.added.map(\.id) == ["md5-aurora"], "a record whose title changed is written again, under the same identifier")
check(retitleDiff.removed.isEmpty, "a title change is not a deletion")
check(retitleDiff.unchanged.map(\.id) == ["md5-borealis"], "only the record that changed is rewritten")

let clearedDiff = PlayedMediaIndexReconcile.diff(previous: unchangedSet, current: [])
check(clearedDiff.removed.count == 2, "clearing the history deletes every published identifier")
check(clearedDiff.added.isEmpty, "clearing the history indexes nothing")
