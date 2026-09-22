export type AppSchemaKind = "intent" | "entity";

export type AppSchemaParameterType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "entity"
  | "entityArray";

export type AppSchemaParameter = Readonly<{
  name: string;
  type: AppSchemaParameterType;
}>;

export type AppSchemaEntry = Readonly<{
  kind: AppSchemaKind;
  reference: string;
  identifier: string;
  minIos: number;
  protocol?: "open" | "delete";
  parameters: readonly AppSchemaParameter[];
  properties: readonly string[];
}>;

export const APP_SCHEMA_DOMAINS: readonly string[] = [
  "assistant", "audio", "books", "browser", "calendar", "camera",
  "clock", "files", "journal", "mail", "maps", "messages",
  "notes", "phone", "photos", "presentation", "reader", "reminders",
  "spreadsheet", "system", "visualIntelligence", "whiteboard", "wordProcessor",
];

export const APP_SCHEMAS: readonly AppSchemaEntry[] = [
  { kind: "intent", reference: "audio.createStation", identifier: "CreateStationIntent", minIos: 27, parameters: [], properties: [] },
  { kind: "intent", reference: "camera.stopCapture", identifier: "StopCaptureIntent", minIos: 18, parameters: [], properties: [] },
  { kind: "intent", reference: "camera.switchDevice", identifier: "FlipCameraIntent", minIos: 18, parameters: [], properties: [] },
  { kind: "intent", reference: "books.openBook", identifier: "OpenBookIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "browser.switchTab", identifier: "SwitchToTabIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "files.openFile", identifier: "OpenFileIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "mail.openDraft", identifier: "MailOpenDraft", minIos: 27, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "mail.openMessage", identifier: "MailOpenMessage", minIos: 27, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "photos.openAlbum", identifier: "OpenMediaAlbumIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "photos.openAsset", identifier: "OpenMediaAssetIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "presentation.open", identifier: "OpenPresentationIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "presentation.openSlide", identifier: "OpenPresentationSlideIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "reader.openPage", identifier: "ReaderOpenPageIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "spreadsheet.open", identifier: "OpenSpreadsheetIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "spreadsheet.openSheet", identifier: "OpenSheetIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "system.open", identifier: "OpenIntent", minIos: 27, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "whiteboard.openBoard", identifier: "OpenCanvasBoardIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "wordProcessor.open", identifier: "OpenWordProcessorDocumentIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "wordProcessor.openPage", identifier: "OpenWordProcessorPageIntent", minIos: 18, protocol: "open", parameters: [{ name: "target", type: "entity" }], properties: [] },
  { kind: "intent", reference: "browser.deleteBookmarks", identifier: "DeleteBookmarksIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "clock.deleteAlarm", identifier: "DeleteAlarmIntent", minIos: 27, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "files.deleteFiles", identifier: "DeleteFilesIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "journal.deleteEntry", identifier: "DeleteJournalEntryIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "mail.deleteDraft", identifier: "DeleteDraftIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "mail.deleteMail", identifier: "DeleteMailIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "photos.deleteAlbum", identifier: "DeleteMediaAlbumIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "photos.deleteAssets", identifier: "DeleteMediaAssetsIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "presentation.deleteSlide", identifier: "DeletePresentationSlideIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "reader.deletePages", identifier: "ReaderDeletePagesIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "reader.rotatePages", identifier: "ReaderRotatePagesIntent", minIos: 18, parameters: [{ name: "pages", type: "entityArray" }, { name: "isClockwise", type: "boolean" }], properties: [] },
  { kind: "intent", reference: "reminders.deleteReminders", identifier: "DeleteRemindersIntent", minIos: 27, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "spreadsheet.delete", identifier: "DeleteSpreadsheetIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "spreadsheet.deleteSheet", identifier: "DeleteSheetIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "whiteboard.deleteBoard", identifier: "DeleteCanvasBoardIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "intent", reference: "whiteboard.deleteItem", identifier: "DeleteCanvasItemIntent", minIos: 18, protocol: "delete", parameters: [{ name: "entities", type: "entityArray" }], properties: [] },
  { kind: "entity", reference: "audio.ambientSound", identifier: "AmbientSoundEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "audio.artist", identifier: "ArtistEntity", minIos: 27, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "audio.liveRadioStation", identifier: "LiveRadioStationEntity", minIos: 27, parameters: [], properties: ["title", "providerName"] },
  { kind: "entity", reference: "audio.newsProvider", identifier: "NewsProviderEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "audio.podcastCollection", identifier: "PodcastCollectionEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "audio.podcastShow", identifier: "PodcastShowEntity", minIos: 27, parameters: [], properties: ["title", "showDescription"] },
  { kind: "entity", reference: "audio.radioShow", identifier: "RadioShowEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "audio.songCollection", identifier: "SongCollectionEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "audio.warmupAudioQueueResult", identifier: "WarmupAudioQueueResult", minIos: 27, parameters: [], properties: [] },
  { kind: "entity", reference: "browser.tabGroup", identifier: "TabGroupEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "calendar.calendar", identifier: "CalendarEntity", minIos: 27, parameters: [], properties: ["title"] },
  { kind: "entity", reference: "mail.account", identifier: "MailAccountEntity", minIos: 18, parameters: [], properties: ["name", "emailAddress"] },
  { kind: "entity", reference: "maps.currentLocation", identifier: "MapsCurrentLocationEntity", minIos: 27, parameters: [], properties: [] },
  { kind: "entity", reference: "notes.account", identifier: "AccountEntity", minIos: 27, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "presentation.document", identifier: "PresentationEntity", minIos: 18, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "presentation.template", identifier: "PresentationTemplateEntity", minIos: 18, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "reader.page", identifier: "ReaderPageEntity", minIos: 18, parameters: [], properties: ["label"] },
  { kind: "entity", reference: "spreadsheet.document", identifier: "SpreadsheetEntity", minIos: 18, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "spreadsheet.template", identifier: "SpreadsheetTemplateEntity", minIos: 18, parameters: [], properties: ["name"] },
  { kind: "entity", reference: "wordProcessor.template", identifier: "WordProcessorDocumentTemplateEntity", minIos: 18, parameters: [], properties: ["name"] },
];

const KNOWN_SCHEMA_REFERENCES: readonly string[] = [
  "assistant.activate", "audio.addToLibrary", "audio.addToPlaylist", "audio.createStation",
  "audio.playAudio", "audio.recognizeAudio", "audio.updateAudioAffinity", "audio.warmupAudioQueue",
  "books.navigatePage", "books.openBook", "books.playAudiobook", "books.search",
  "books.updateCharacterSpacing", "books.updateFontSize", "books.updateLineSpacing", "books.updateSettings",
  "books.updateWordSpacing", "browser.bookmarkTab", "browser.bookmarkURL", "browser.clearHistory",
  "browser.closeTabs", "browser.closeWindows", "browser.createTab", "browser.createWindow",
  "browser.deleteBookmarks", "browser.findOnPage", "browser.openBookmark", "browser.openURLInTab",
  "browser.search", "browser.switchTab", "calendar.createEvent", "calendar.deleteEvent",
  "calendar.updateEvent", "camera.openInCaptureMode", "camera.setDevice", "camera.startCapture",
  "camera.stopCapture", "camera.switchDevice", "clock.cancelTimer", "clock.createAlarm",
  "clock.createTimer", "clock.deleteAlarm", "clock.dismissAlarm", "clock.lapStopwatch",
  "clock.pauseTimer", "clock.resetStopwatch", "clock.resumeTimer", "clock.snoozeAlarm",
  "clock.startStopwatch", "clock.stopStopwatch", "clock.updateAlarm", "clock.updateTimer",
  "files.createFolder", "files.deleteFiles", "files.moveFiles", "files.openFile",
  "files.renameFile", "journal.createAudioEntry", "journal.createEntry", "journal.deleteEntry",
  "journal.search", "journal.updateEntry", "mail.archiveMail", "mail.createDraft",
  "mail.deleteDraft", "mail.deleteMail", "mail.forwardMail", "mail.openDraft",
  "mail.openMessage", "mail.replyMail", "mail.saveDraft", "mail.sendDraft",
  "mail.updateDraft", "mail.updateMail", "maps.reportIncident", "maps.shareETA",
  "maps.startNavigation", "maps.stopNavigation", "maps.stopShareETA", "maps.updateNavigationWaypoints",
  "messages.draftMessage", "messages.editSentMessage", "messages.sendMessage", "messages.setMessageReadStatus",
  "messages.unsendMessage", "notes.appendText", "notes.createNote", "notes.updateNote",
  "phone.startCall", "photos.addAssetsToAlbum", "photos.cleanupPhoto", "photos.copyEdits",
  "photos.createAlbum", "photos.createAssets", "photos.crop", "photos.deleteAlbum",
  "photos.deleteAssets", "photos.duplicateAssets", "photos.editAsset", "photos.openAlbum",
  "photos.openAsset", "photos.pasteEdits", "photos.postToSharedAlbum", "photos.removeAssetsFromAlbum",
  "photos.search", "photos.setDepth", "photos.setExposure", "photos.setFilter",
  "photos.setRotation", "photos.setSaturation", "photos.setWarmth", "photos.straighten",
  "photos.toggleDepth", "photos.toggleSuggestedEdits", "photos.updateAlbum", "photos.updateAsset",
  "photos.updateRecognizedPerson", "presentation.addAudioToSlide", "presentation.addCommentToSlide", "presentation.addImageToSlide",
  "presentation.addTextBoxToSlide", "presentation.addVideoToSlide", "presentation.addWebVideoToSlide", "presentation.create",
  "presentation.createSlide", "presentation.deleteSlide", "presentation.open", "presentation.openSlide",
  "presentation.setSlideTitle", "presentation.startPlayback", "presentation.stopPlayback", "presentation.update",
  "reader.deletePages", "reader.enhanceDocuments", "reader.insertPages", "reader.openDocument",
  "reader.openPage", "reader.resizeDocuments", "reader.rotateDocuments", "reader.rotatePages",
  "reader.searchDocuments", "reminders.createList", "reminders.createReminder", "reminders.createSection",
  "reminders.deleteReminders", "reminders.updateReminder", "spreadsheet.addAudioToSheet", "spreadsheet.addCommentToSheet",
  "spreadsheet.addImageToSheet", "spreadsheet.addTextBoxToSheet", "spreadsheet.addVideoToSheet", "spreadsheet.addWebVideoToSheet",
  "spreadsheet.create", "spreadsheet.createSheet", "spreadsheet.delete", "spreadsheet.deleteSheet",
  "spreadsheet.open", "spreadsheet.openSheet", "spreadsheet.update", "spreadsheet.updateSheet",
  "system.open", "system.search", "system.searchInApp", "visualIntelligence.semanticContentSearch",
  "whiteboard.createBoard", "whiteboard.createItem", "whiteboard.deleteBoard", "whiteboard.deleteItem",
  "whiteboard.openBoard", "whiteboard.updateBoard", "whiteboard.updateItem", "wordProcessor.addAudioToPage",
  "wordProcessor.addImageToPage", "wordProcessor.addTextBoxToPage", "wordProcessor.addVideoToPage", "wordProcessor.addWebVideoToPage",
  "wordProcessor.create", "wordProcessor.createPage", "wordProcessor.open", "wordProcessor.openPage",
  "audio.album", "audio.algorithmicRadioStation", "audio.ambientSound", "audio.artist",
  "audio.audiobook", "audio.classicalMusicRecording", "audio.liveRadioStation", "audio.newsBrief",
  "audio.newsProvider", "audio.playlist", "audio.podcastCollection", "audio.podcastEpisode",
  "audio.podcastShow", "audio.radioShow", "audio.radioShowEpisode", "audio.song",
  "audio.songCollection", "audio.warmupAudioQueueResult", "books.audiobook", "books.book",
  "books.settings", "browser.bookmark", "browser.readingListItem", "browser.tab",
  "browser.tabGroup", "browser.window", "calendar.attendee", "calendar.calendar",
  "calendar.event", "clock.alarm", "clock.stopwatch", "clock.timer",
  "files.file", "journal.entry", "mail.account", "mail.draft",
  "mail.mailbox", "mail.message", "mail.thread", "maps.currentLocation",
  "maps.navigationSession", "maps.operatingHours", "maps.operatingTimeRange", "maps.place",
  "maps.rating", "messages.conversation", "messages.customAttachment", "messages.message",
  "messages.messagePerson", "notes.account", "notes.folder", "notes.note",
  "phone.phonePerson", "photos.album", "photos.asset", "photos.recognizedPerson",
  "presentation.document", "presentation.slide", "presentation.template", "reader.document",
  "reader.page", "reminders.group", "reminders.list", "reminders.locationTrigger",
  "reminders.reminder", "reminders.section", "spreadsheet.document", "spreadsheet.sheet",
  "spreadsheet.template", "whiteboard.board", "whiteboard.item", "wordProcessor.document",
  "wordProcessor.page", "wordProcessor.template",
];

const KNOWN_SCHEMA_REFERENCE_SET: ReadonlySet<string> = new Set(KNOWN_SCHEMA_REFERENCES);

export function isKnownSchemaReference(reference: string): boolean {
  return KNOWN_SCHEMA_REFERENCE_SET.has(reference);
}

export function findAppSchema(kind: AppSchemaKind, reference: string): AppSchemaEntry | undefined {
  return APP_SCHEMAS.find((entry) => entry.kind === kind && entry.reference === reference);
}
