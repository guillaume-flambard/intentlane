//
//  PlayedMediaCore.swift
//  iina
//
//  IntentLane pilot — pure, testable core for the PlayedMedia entity.
//
//  This file deliberately has no IINA or App Intents dependency so the mapping,
//  resolution, openability, open decision and subtitle rules can be tested in
//  isolation. The IINA seams (HistoryController, PlayerCore) live in
//  PlayedMediaAdapter.swift, and the Spotlight calls live in PlayedMediaIndex.swift.
//
//  Privacy rule: a record never exposes a filesystem path. The stable identifier
//  is IINA's own mpv hash; the display title is the stored title or the file
//  basename; the subtitle is the media kind only.
//

import Foundation

/// A media item derived from IINA's local playback history, safe to display and
/// index: no full path is ever part of `id`, `title` or `kind`.
struct PlayedMediaRecord: Equatable {
  let id: String
  let title: String
  let kind: String

  /// The date IINA recorded for this entry. It is data, not display: the subtitle
  /// is the media kind only, and recency comes from the order of the records.
  let lastPlayed: Date

  /// The local file URL is kept only so the open seam can play it. It is never
  /// used as an identifier, a title, a subtitle or an indexed attribute.
  let url: URL
}

/// The plain inputs the core needs, so tests can build records without IINA.
struct PlayedMediaInput: Equatable {
  let url: URL
  let name: String
  let title: String?
  let mpvMd5: String
  let addedDate: Date
}

/// The one rule that decides whether an item may be exposed at all.
///
/// Exposing one media item and exposing every media item are two different offers,
/// so the exclusion is a named decision rather than a condition inlined in the
/// resolver and again in the open path. Two copies of a rule is how a pilot ends up
/// refusing to open something it still offers to search.
struct PlayedMediaAccess {

  /// Why an item is not offered. Each case names a rule, because "nothing came
  /// back" and "the user switched recording off" are different answers.
  enum Refusal: Equatable {
    case recordingDisabled
    case fileMissing

    var reason: String {
      switch self {
      case .recordingDisabled:
        return "History recording is off, so this item is not exposed."
      case .fileMissing:
        return "The file for this item no longer exists."
      }
    }
  }

  enum Decision: Equatable {
    case granted
    case refused(Refusal)
  }

  let recordingEnabled: Bool
  let fileExists: (URL) -> Bool

  func decision(for record: PlayedMediaRecord) -> Decision {
    guard recordingEnabled else { return .refused(.recordingDisabled) }
    guard fileExists(record.url) else { return .refused(.fileMissing) }
    return .granted
  }

  func allows(_ record: PlayedMediaRecord) -> Bool {
    decision(for: record) == .granted
  }
}

struct PlayedMediaIndexDiff: Equatable {
  let added: [PlayedMediaRecord]
  let removed: [String]
  let unchanged: [PlayedMediaRecord]

  var isEmpty: Bool { added.isEmpty && removed.isEmpty && unchanged.isEmpty }
}

/// Reconciles what was published into the named index against what the history holds
/// now, so a history event costs the writes it actually needs.
///
/// The memory of what was published is the adapter's, not Spotlight's: a named index
/// has no read-back. Rewriting the whole index on every event would be correct and
/// wasteful, and it would also throw away the recency the system derived from write
/// order for the records that did not change.
enum PlayedMediaIndexReconcile {

  /// A record counts as unchanged only when everything the system shows is the same.
  /// `lastPlayed` is deliberately part of that: it is why the record is ordered, and
  /// playing the same media again must move it.
  static func sameContent(_ left: PlayedMediaRecord, _ right: PlayedMediaRecord) -> Bool {
    left.id == right.id && left.title == right.title && left.kind == right.kind
      && left.lastPlayed == right.lastPlayed
  }

  static func diff(previous: [PlayedMediaRecord], current: [PlayedMediaRecord]) -> PlayedMediaIndexDiff {
    let published = Dictionary(previous.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    var added: [PlayedMediaRecord] = []
    var unchanged: [PlayedMediaRecord] = []
    for record in current {
      guard let before = published[record.id] else {
        added.append(record)
        continue
      }
      if sameContent(before, record) { unchanged.append(record) } else { added.append(record) }
    }
    let live = Set(current.map(\.id))
    let removed = previous.map(\.id).filter { !live.contains($0) }
    return PlayedMediaIndexDiff(added: added, removed: removed, unchanged: unchanged)
  }
}

enum PlayedMediaCore {

  /// The stable, path-free identifier: IINA's stored mpv hash.
  ///
  /// IINA computes this hash from the canonical media URL, so identity is stable
  /// across runs and across a title change, and it never reveals a filesystem
  /// path. It is not stable across a move or a rename: the identifier changes, the
  /// previous one resolves to nothing, and nothing is opened in its place. The
  /// next index refresh republishes the item under its new identifier.
  static func identifier(for input: PlayedMediaInput) -> String {
    input.mpvMd5
  }

  /// The user-visible title: IINA's stored title first, then the file basename.
  /// An empty stored title is treated as absent so the basename wins.
  static func displayTitle(title: String?, name: String) -> String {
    if let title, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return title
    }
    return name
  }

  /// Media kind derived from the file extension only — never the path.
  static func mediaKind(for url: URL) -> String {
    let ext = url.pathExtension.lowercased()
    switch ext {
    case "mp3", "m4a", "aac", "flac", "wav", "ogg", "opus", "aiff":
      return "Audio"
    case "mp4", "m4v", "mov", "mkv", "webm", "avi", "flv", "wmv", "ts", "mpg", "mpeg":
      return "Video"
    default:
      return "Media"
    }
  }

  /// The subtitle the system shows: the media kind, and nothing else.
  ///
  /// The last-played date is deliberately not part of it. It changes every time
  /// the same media is played again, so a date-bearing subtitle would make the
  /// Spotlight record mutable on the most frequent history event, and recency is
  /// already carried by the order the records keep.
  static func subtitle(for record: PlayedMediaRecord) -> String {
    record.kind
  }

  /// Map one history input to a display/index-safe record.
  static func record(from input: PlayedMediaInput) -> PlayedMediaRecord {
    PlayedMediaRecord(
      id: identifier(for: input),
      title: displayTitle(title: input.title, name: input.name),
      kind: mediaKind(for: input.url),
      lastPlayed: input.addedDate,
      url: input.url
    )
  }

  /// The shared history-to-record mapping: the single rule used by the resolver,
  /// the open path and the index refresh, so the three can never disagree.
  /// History order is kept, and only items the access decision allows are returned.
  static func records(from inputs: [PlayedMediaInput], access: PlayedMediaAccess) -> [PlayedMediaRecord] {
    inputs.compactMap { input in
      let record = record(from: input)
      return access.allows(record) ? record : nil
    }
  }

  /// Case- and diacritic-insensitive match over the user-visible title.
  /// An empty/blank query resolves to zero records: a search never falls back to
  /// "everything" and never approximates. Duplicate titles stay as separate
  /// records so the system can ask which one to open.
  static func matches(_ records: [PlayedMediaRecord], query: String) -> [PlayedMediaRecord] {
    let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !needle.isEmpty else { return [] }
    return records.filter { record in
      record.title.range(of: needle, options: [.caseInsensitive, .diacriticInsensitive]) != nil
    }
  }

  /// A record is openable only when the exact local file still exists.
  /// A deleted file is never substituted with another record.
  static func isOpenable(_ record: PlayedMediaRecord, fileExists: (URL) -> Bool) -> Bool {
    fileExists(record.url)
  }}

// MARK: - Open

/// The one call an open request makes into the application. The production
/// implementation forwards to IINA's established playback path; a test supplies a
/// recording double, so the decision can be proven without a player.
protocol IINAPlaybackOpening {
  func open(_ url: URL)
}

enum PlayedMediaOpenError: LocalizedError {
  case unavailable

  var errorDescription: String? { "That media item is no longer available." }
}

enum PlayedMediaOpen {

  /// Open the exact record for an identifier, or throw. The shared mapping decides
  /// what is openable, so an unknown identifier, recording switched off and a
  /// deleted file all fail the same way, and no substitute is ever opened.
  @discardableResult
  static func perform(
    identifier: String,
    inputs: [PlayedMediaInput],
    access: PlayedMediaAccess,
    player: IINAPlaybackOpening
  ) throws -> URL {
    let record = PlayedMediaCore.records(from: inputs, access: access).first(where: { $0.id == identifier })
    guard let record else { throw PlayedMediaOpenError.unavailable }
    player.open(record.url)
    return record.url
  }
}
