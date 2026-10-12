//
//  PlayedMediaHandlers.swift
//  iina
//
//  IntentLane pilot — the resolver, the open path and the search routing, with no
//  IINA dependency.
//
//  This file holds everything that decides what IntentLane does, and depends only
//  on the generated entities and on three seams: the playback history, the player
//  and the in-app search surface. IINA's own types are confined to
//  PlayedMediaIntegration.swift, which is what lets the integration tests execute
//  this code with the real generated entities and no running app.
//

import AppIntents
import Foundation

// MARK: - Seams

/// The playback history, as the pure core needs it. IINA implements this over
/// `HistoryController` and `Preference`; a test implements it over a literal.
protocol IntentLanePlayedMediaHistorySource: Sendable {
  /// The history is only a valid source while the user keeps recording on.
  var isRecordingEnabled: Bool { get }
  func currentInputs() -> [PlayedMediaInput]
  func fileExists(at url: URL) -> Bool
}

/// The in-app search surface a `system.searchInApp` request routes to.
@MainActor
protocol IntentLaneInAppSearchSurface: AnyObject {
  func applySearch(_ term: String)
}

// MARK: - History

/// The single source of played-media records for IntentLane. The resolver, the
/// open path and the index refresh all read through this mapping, so they can
/// never disagree about what is playable.
struct IntentLanePlayedMediaHistory {

  let source: any IntentLanePlayedMediaHistorySource

  /// The one access decision this history exposes, built from the source. Every
  /// caller goes through it, so the resolver, the open path and the index refresh
  /// cannot disagree about what may be offered.
  var access: PlayedMediaAccess {
    PlayedMediaAccess(recordingEnabled: source.isRecordingEnabled, fileExists: { [source] url in
      source.fileExists(at: url)
    })
  }

  /// The current history as records, in history order, openable only.
  func records() -> [PlayedMediaRecord] {
    PlayedMediaCore.records(from: source.currentInputs(), access: access)
  }

  /// The exact record for an identifier, or nil when it is unknown, recording is
  /// off, or its local file is gone. Never a substitute.
  func record(withIdentifier identifier: String) -> PlayedMediaRecord? {
    records().first { $0.id == identifier }
  }
}

// MARK: - Entity

@available(macOS 27.0, *)
extension IntentLanePlayedMediaEntity {

  /// The one place a record becomes an entity, so the subtitle decision in the
  /// core is the one the system sees.
  static func from(_ record: PlayedMediaRecord) -> IntentLanePlayedMediaEntity {
    IntentLanePlayedMediaEntity(id: record.id, title: record.title, kind: PlayedMediaCore.subtitle(for: record))
  }
}

// MARK: - Resolver

/// Resolves played media against IINA's local playback history.
/// Returns only records whose local file still exists; an unknown name returns
/// no entity, never a substitute.
@available(macOS 27.0, *)
actor IntentLanePlayedMediaResolverImplementation: IntentLanePlayedMediaResolver {

  private let history: IntentLanePlayedMediaHistory

  init(source: any IntentLanePlayedMediaHistorySource) {
    self.history = IntentLanePlayedMediaHistory(source: source)
  }

  func playedMediaEntities(for identifiers: [String]) async throws -> [IntentLanePlayedMediaEntity] {
    let requested = Set(identifiers)
    return await MainActor.run {
      history.records()
        .filter { requested.contains($0.id) }
        .map(IntentLanePlayedMediaEntity.from)
    }
  }

  func playedMediaEntities(matching string: String) async throws -> [IntentLanePlayedMediaEntity] {
    await MainActor.run {
      let records = PlayedMediaCore.matches(history.records(), query: string)
      return records.map(IntentLanePlayedMediaEntity.from)
    }
  }

  func suggestedPlayedMediaEntities() async throws -> [IntentLanePlayedMediaEntity] {
    await MainActor.run {
      history.records().map(IntentLanePlayedMediaEntity.from)
    }
  }
}

// MARK: - Open

/// Opens an exact played-media item through IINA's existing playback path.
@available(macOS 27.0, *)
actor IntentLaneOpenPlayedMediaImplementation: OpenPlayedMediaHandler {

  private let history: IntentLanePlayedMediaHistory
  private let player: any IINAPlaybackOpening

  init(source: any IntentLanePlayedMediaHistorySource, player: any IINAPlaybackOpening) {
    self.history = IntentLanePlayedMediaHistory(source: source)
    self.player = player
  }

  func perform(target: IntentLanePlayedMediaEntity) async throws {
    // An unknown identifier, recording switched off and a deleted file all fail
    // the same way, in the tested core rule. No approximation, no substitute.
    try await MainActor.run {
      try PlayedMediaOpen.perform(
        identifier: target.id,
        inputs: history.source.currentInputs(),
        access: history.access,
        player: player
      )
    }
  }
}

// MARK: - Search in app

/// Routes the `system.searchInApp` schema to the in-app search surface.
@available(macOS 27.0, *)
actor IntentLaneSearchPlayedMediaImplementation: SearchPlayedMediaHandler {

  private let surface: any IntentLaneInAppSearchSurface

  init(surface: any IntentLaneInAppSearchSurface) {
    self.surface = surface
  }

  func perform(criteria: StringSearchCriteria) async throws {
    let term = criteria.term
    await MainActor.run { surface.applySearch(term) }
  }
}
