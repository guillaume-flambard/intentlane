//
//  PlayedMediaIndex.swift
//  iina
//
//  IntentLane pilot — the named Spotlight index for the PlayedMedia entity.
//
//  This file deliberately has no IINA dependency, so the real Core Spotlight
//  calls it makes can be exercised by a test executable against a real named
//  index. The adapter decides *what* to index; this file owns *where*.
//
//  App Intents in the macOS 27 SDK offers exactly three operations here:
//  indexAppEntities, deleteAppEntities(identifiedBy:ofType:) and
//  deleteAppEntities(ofType:). There is no read-back, so a refresh rewrites the
//  type rather than subtracting a remembered set, and nothing is persisted to
//  track what used to be indexed.
//

import AppIntents
import CoreSpotlight

@available(macOS 27.0, *)
enum IntentLanePlayedMediaIntegration {

  /// Named so the pilot's entities are donated to IINA's own index rather than
  /// the shared default index.
  static let indexName = "dev.memolabs.intentlane.iina-pilot.played_media"

  static func searchableIndex(name: String = indexName) -> CSSearchableIndex {
    CSSearchableIndex(name: name)
  }

  static func index(_ entities: [IntentLanePlayedMediaEntity], name: String = indexName) async throws {
    try await searchableIndex(name: name).indexAppEntities(entities)
  }

  static func removeAll(name: String = indexName) async throws {
    try await searchableIndex(name: name).deleteAppEntities(ofType: IntentLanePlayedMediaEntity.self)
  }

  /// Remove named identifiers only, which is what a reconciliation needs.
  ///
  /// A named index cannot be read back, so the adapter remembers what it published
  /// and deletes the identifiers that no longer appear. Deleting by identifier is
  /// the only operation that leaves the records that did not change alone; emptying
  /// the type would take them out and put them back, and the system would read that
  /// as every record having just been played.
  static func remove(identifiers: [String], name: String = indexName) async throws {
    guard !identifiers.isEmpty else { return }
    try await searchableIndex(name: name)
      .deleteAppEntities(identifiedBy: identifiers, ofType: IntentLanePlayedMediaEntity.self)
  }
}
