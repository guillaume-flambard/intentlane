//
//  PlayedMediaIntegration.swift
//  iina
//
//  IntentLane pilot — the IINA side of the integration: the three seams, the
//  registration at launch, and the named Spotlight index lifecycle.
//
//  This is the only IntentLane file that knows IINA exists. Everything that
//  decides behaviour lives in PlayedMediaHandlers.swift, so the integration can be
//  executed in a test without launching IINA.
//
//  Privacy: no filesystem path is ever exposed as an identifier, title or
//  subtitle, and nothing is indexed unless history recording is enabled.
//

import AppIntents
import Cocoa

// MARK: - Seams

/// IINA's playback history, read on the main thread where `Preference` and the
/// history controller live.
@available(macOS 27.0, *)
@MainActor
struct IntentLaneIINAHistorySource: IntentLanePlayedMediaHistorySource {

  var isRecordingEnabled: Bool {
    Preference.bool(for: .recordPlaybackHistory)
  }

  func currentInputs() -> [PlayedMediaInput] {
    HistoryController.shared.history.map {
      PlayedMediaInput(url: $0.url, name: $0.name, title: $0.title, mpvMd5: $0.mpvMd5, addedDate: $0.addedDate)
    }
  }

  func fileExists(at url: URL) -> Bool {
    FileManager.default.fileExists(atPath: url.path)
  }
}

/// The established IINA playback path, the same one the History window uses. The
/// open decision itself lives in the pure core, where it is tested with a
/// recording double.
@available(macOS 27.0, *)
@MainActor
struct IntentLaneIINAPlayback: IINAPlaybackOpening {
  func open(_ url: URL) {
    PlayerCore.activeOrNew.openURL(url)
  }
}

/// IINA's existing History window, where a system search request lands.
@available(macOS 27.0, *)
@MainActor
final class IntentLaneIINAHistoryWindow: IntentLaneInAppSearchSurface {
  func applySearch(_ term: String) {
    AppDelegate.shared.historyWindow.applySearch(term)
  }
}

// MARK: - Registration

@MainActor
@available(macOS 27.0, *)
enum IntentLanePlayedMediaAdapter {

  /// Set once registration has run, so a runtime probe can prove the adapter is
  /// live without a test target.
  static let registrationKey = "dev.memolabs.intentlane.iina-pilot.played_media.registered"

  private static var notificationObservers: [NSObjectProtocol] = []
  private static var preferenceObserver: PreferenceObserver?

  /// True once the resolver and handlers have been registered this launch.
  static var isRegistered: Bool {
    UserDefaults.standard.bool(forKey: registrationKey)
  }

  /// Register the resolver and handlers once, at launch, and keep the named index
  /// reconciled with IINA's playback history from then on.
  static func register() {
    let source = IntentLaneIINAHistorySource()
    IntentLaneEntityResolvers.played_media = IntentLanePlayedMediaResolverImplementation(source: source)
    IntentLaneIntentHandlers.open_played_media = IntentLaneOpenPlayedMediaImplementation(
      source: source, player: IntentLaneIINAPlayback()
    )
    IntentLaneIntentHandlers.search_played_media = IntentLaneSearchPlayedMediaImplementation(
      surface: IntentLaneIINAHistoryWindow()
    )
    // The flag is written only when all three registries really hold an
    // implementation, so a probe reading it cannot be fooled by a partial launch.
    let resolver = IntentLaneEntityResolvers.played_media != nil
    let open = IntentLaneIntentHandlers.open_played_media != nil
    let search = IntentLaneIntentHandlers.search_played_media != nil
    if resolver && open && search {
      UserDefaults.standard.set(true, forKey: registrationKey)
    }
    Logger.log("IntentLane: PlayedMedia registered, resolver \(resolver), open \(open), search \(search), named index \(IntentLanePlayedMediaIntegration.indexName)")
    observeHistory()
  }

  /// What this launch published into the named index.
  ///
  /// A named index has no read-back, so this is the only record of what is in it.
  /// Whether this launch has synced at all is tracked separately, because an empty
  /// history is a legitimate state: treating "nothing published" as "never synced"
  /// makes the next event rewrite the whole index instead of reconciling, which is
  /// the expensive path and logs a rewrite where a reconciliation happened.
  @MainActor
  private static var published: [PlayedMediaRecord] = []

  @MainActor
  private static var hasSynced = false

  /// Keep the named index reconciled with IINA's playback history.
  ///
  /// Nothing is indexed while recording is off, and the index is emptied in that
  /// case, so nothing stays offered after the user switches history recording off.
  /// Once this launch has published something, a change costs only the writes it
  /// needs: the identifiers that left are deleted and the records that changed are
  /// written again, and the ones that did not change are left alone.
  static func refreshIndex() async throws {
    let history = IntentLanePlayedMediaHistory(source: IntentLaneIINAHistorySource())
    let records = history.records()

    if !hasSynced {
      try await IntentLanePlayedMediaIntegration.removeAll()
      if !records.isEmpty {
        try await IntentLanePlayedMediaIntegration.index(records.map(IntentLanePlayedMediaEntity.from))
      }
      published = records
      hasSynced = true
      Logger.log("IntentLane: rewrote \(records.count) item(s) in \(IntentLanePlayedMediaIntegration.indexName)")
      return
    }

    let diff = PlayedMediaIndexReconcile.diff(previous: published, current: records)
    try await IntentLanePlayedMediaIntegration.remove(identifiers: diff.removed)
    if !diff.added.isEmpty {
      try await IntentLanePlayedMediaIntegration.index(diff.added.map(IntentLanePlayedMediaEntity.from))
    }
    published = records
    Logger.log("IntentLane: indexed \(diff.added.count) item(s), deleted \(diff.removed.count), left \(diff.unchanged.count) in \(IntentLanePlayedMediaIntegration.indexName)")
  }

  /// KVO on a UserDefaults key needs an observer object, which has to be retained
  /// for as long as the observation is wanted.
  private final class PreferenceObserver: NSObject {
    override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                               change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
      guard keyPath == Preference.Key.recordPlaybackHistory.rawValue else { return }
      Task { @MainActor in try? await IntentLanePlayedMediaAdapter.refreshIndex() }
    }
  }

  private static func observeHistory() {
    guard notificationObservers.isEmpty else { return }
    let center = NotificationCenter.default
    notificationObservers = [.iinaHistoryUpdated, .iinaHistoryTaskFinished].map { name in
      center.addObserver(forName: name, object: nil, queue: .main) { _ in
        Task { @MainActor in try? await IntentLanePlayedMediaAdapter.refreshIndex() }
      }
    }
    let observer = PreferenceObserver()
    UserDefaults.standard.addObserver(observer, forKeyPath: Preference.Key.recordPlaybackHistory.rawValue,
                                      options: [.new], context: nil)
    preferenceObserver = observer
  }
}
