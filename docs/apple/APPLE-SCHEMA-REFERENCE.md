# Référence complète des actions App Schema connues d'IntentLane

Portée : macOS/iOS 27, catalogue Xcode connu par IntentLane au 23 septembre
2026. Ce document est exhaustif pour les références reconnues dans
[`packages/core/src/app-schemas.ts`](../../packages/core/src/app-schemas.ts), mais il
ne prétend pas que chaque ligne est utilisable par chaque application. Une
action exige son objet métier, son contrat Apple exact, les autorisations et
une preuve réelle.

Il existe aussi un nombre illimité d'actions App Intent personnalisées. Elles
peuvent être excellentes dans une application ou Raccourcis, mais ne deviennent
pas automatiquement des commandes Siri AI par le simple fait d'exister.

Légende : **G** = forme Swift générée et testée par IntentLane; **R** =
référence reconnue, à implémenter et valider avant d'être proposée; **A** =
automatisation seulement, à ne pas vendre comme Siri AI primaire.

## Socle agnostique

| Capacité | Utilité | État |
| --- | --- | --- |
| `AppEntity` + requête | représenter un objet réel par ID | G |
| `EntityStringQuery` | transformer un nom prononcé en objets possibles | G |
| `IndexedEntity` + Spotlight | rendre un objet découvrable | G |
| `system.open` + `OpenIntent` | ouvrir l'objet choisi | G |
| `system.searchInApp` | ouvrir la vraie recherche interne | G |
| App Intent personnalisé | réaliser une opération métier | G, surface à qualifier |
| `AppShortcutsProvider` | exposer une action dans Raccourcis | G, automatisation distincte |

## Actions par domaine

### Assistant

- `assistant.activate` : activer l'assistant. **R**

### Audio

- `audio.addToLibrary`, `audio.addToPlaylist`, `audio.createStation` **G**,
  `audio.playAudio`, `audio.recognizeAudio`, `audio.updateAudioAffinity`,
  `audio.warmupAudioQueue`. **R**
- Objets : album, station algorithmique, son ambiant **G**, artiste **G**,
  livre audio, enregistrement classique, station radio live **G**, brève
  d'actualité, fournisseur d'actualités **G**, playlist, collection podcast
  **G**, épisode podcast, émission podcast **G**, émission radio **G**, épisode
  radio, morceau, collection de morceaux **G**, résultat de préchauffage **G**.

### Livres

- `books.navigatePage`, `books.openBook` **G/A**, `books.playAudiobook`,
  `books.search`, `books.updateCharacterSpacing`, `books.updateFontSize`,
  `books.updateLineSpacing`, `books.updateSettings`, `books.updateWordSpacing`.
  **R/A**
- Objets : livre audio, livre, réglages. **R/A**

### Navigateur

- `browser.bookmarkTab`, `browser.bookmarkURL`, `browser.clearHistory`,
  `browser.closeTabs`, `browser.closeWindows`, `browser.createTab`,
  `browser.createWindow`, `browser.deleteBookmarks` **G/A**,
  `browser.findOnPage`, `browser.openBookmark`, `browser.openURLInTab`,
  `browser.search`, `browser.switchTab` **G/A**. Les autres sont **R/A**.
- Objets : marque-page, élément de liste de lecture, onglet, groupe d'onglets
  **G/A**, fenêtre. Les autres sont **R/A**.

### Calendrier

- `calendar.createEvent`, `calendar.deleteEvent`, `calendar.updateEvent`.
  **R**, toujours sensible car ces actions modifient un agenda.
- Objets : participant, calendrier **G**, événement. Les autres sont **R**.

### Caméra

- `camera.openInCaptureMode`, `camera.setDevice`, `camera.startCapture`,
  `camera.stopCapture` **G**, `camera.switchDevice` **G**. Les prises de vue
  doivent être traitées comme sensibles.

### Horloge

- `clock.cancelTimer`, `clock.createAlarm`, `clock.createTimer`,
  `clock.deleteAlarm` **G**, `clock.dismissAlarm`, `clock.lapStopwatch`,
  `clock.pauseTimer`, `clock.resetStopwatch`, `clock.resumeTimer`,
  `clock.snoozeAlarm`, `clock.startStopwatch`, `clock.stopStopwatch`,
  `clock.updateAlarm`, `clock.updateTimer`. Les autres sont **R**.
- Objets : alarme, chronomètre, minuteur. **R**.

### Fichiers

- `files.createFolder`, `files.deleteFiles` **G**, `files.moveFiles`,
  `files.openFile` **G**, `files.renameFile`. Les autres sont **R**.
- Objet : fichier. **R**. Toute suppression, modification ou déplacement est
  sensible.

### Journal

- `journal.createAudioEntry`, `journal.createEntry`, `journal.deleteEntry`
  **G/A**, `journal.search`, `journal.updateEntry`. Les autres sont **R/A**.
- Objet : entrée de journal. **R/A**.

### Mail

- `mail.archiveMail`, `mail.createDraft`, `mail.deleteDraft` **G**,
  `mail.deleteMail` **G**, `mail.forwardMail`, `mail.openDraft` **G**,
  `mail.openMessage` **G**, `mail.replyMail`, `mail.saveDraft`,
  `mail.sendDraft`, `mail.updateDraft`, `mail.updateMail`. Les autres sont
  **R**.
- Objets : compte **G**, brouillon, boîte, message, fil. Les autres sont **R**.
  Ce domaine traite des données privées et des envois externes.

### Plans

- `maps.reportIncident`, `maps.shareETA`, `maps.startNavigation`,
  `maps.stopNavigation`, `maps.stopShareETA`, `maps.updateNavigationWaypoints`.
  **R**.
- Objets : emplacement courant **G**, session de navigation, horaires,
  intervalle horaire, lieu, note. Les autres sont **R**.

### Messages

- `messages.draftMessage`, `messages.editSentMessage`,
  `messages.sendMessage`, `messages.setMessageReadStatus`,
  `messages.unsendMessage`. **R** et sensibles.
- Objets : conversation, pièce jointe personnalisée, message, personne.
  **R**.

### Notes

- `notes.appendText`, `notes.createNote`, `notes.updateNote`. **R**.
- Objets : compte **G**, dossier, note. Les autres sont **R**.

### Téléphone

- `phone.startCall`. **R**, avec contrôle explicite de la personne appelée.
- Objet : personne téléphone. **R**.

### Photos

- `photos.addAssetsToAlbum`, `photos.cleanupPhoto`, `photos.copyEdits`,
  `photos.createAlbum`, `photos.createAssets`, `photos.crop`,
  `photos.deleteAlbum` **G**, `photos.deleteAssets` **G**,
  `photos.duplicateAssets`, `photos.editAsset`, `photos.openAlbum` **G**,
  `photos.openAsset` **G**, `photos.pasteEdits`, `photos.postToSharedAlbum`,
  `photos.removeAssetsFromAlbum`, `photos.search`, `photos.setDepth`,
  `photos.setExposure`, `photos.setFilter`, `photos.setRotation`,
  `photos.setSaturation`, `photos.setWarmth`, `photos.straighten`,
  `photos.toggleDepth`, `photos.toggleSuggestedEdits`, `photos.updateAlbum`,
  `photos.updateAsset`, `photos.updateRecognizedPerson`. Les autres sont **R**.
- Objets : album, média, personne reconnue. **R**. Privé et souvent destructif.

### Présentation

- `presentation.addAudioToSlide`, `presentation.addCommentToSlide`,
  `presentation.addImageToSlide`, `presentation.addTextBoxToSlide`,
  `presentation.addVideoToSlide`, `presentation.addWebVideoToSlide`,
  `presentation.create`, `presentation.createSlide`, `presentation.deleteSlide`
  **G/A**, `presentation.open` **G/A**, `presentation.openSlide` **G/A**,
  `presentation.setSlideTitle`, `presentation.startPlayback`,
  `presentation.stopPlayback`, `presentation.update`. Les autres sont **R/A**.
- Objets : document **G/A**, diapositive, modèle **G/A**. Les autres sont **R/A**.

### Lecteur de documents

- `reader.deletePages` **G/A**, `reader.enhanceDocuments`,
  `reader.insertPages`, `reader.openDocument`, `reader.openPage` **G/A**,
  `reader.resizeDocuments`, `reader.rotateDocuments`, `reader.rotatePages`
  **G/A**, `reader.searchDocuments`. Les autres sont **R/A**.
- Objets : document, page **G/A**. L'utilisation du terme Reader ne convient
  pas à une app RSS et ne remplace pas `system.open`.

### Rappels

- `reminders.createList`, `reminders.createReminder`,
  `reminders.createSection`, `reminders.deleteReminders` **G**,
  `reminders.updateReminder`. Les autres sont **R**.
- Objets : groupe, liste, déclencheur de lieu, rappel, section. **R**.

### Feuilles de calcul

- `spreadsheet.addAudioToSheet`, `spreadsheet.addCommentToSheet`,
  `spreadsheet.addImageToSheet`, `spreadsheet.addTextBoxToSheet`,
  `spreadsheet.addVideoToSheet`, `spreadsheet.addWebVideoToSheet`,
  `spreadsheet.create`, `spreadsheet.createSheet`, `spreadsheet.delete` **G/A**,
  `spreadsheet.deleteSheet` **G/A**, `spreadsheet.open` **G/A**,
  `spreadsheet.openSheet` **G/A**, `spreadsheet.update`,
  `spreadsheet.updateSheet`. Les autres sont **R/A**.
- Objets : document **G/A**, feuille, modèle **G/A**. Les autres sont **R/A**.

### Système et intelligence visuelle

- `system.open` **G**, `system.search` déprécié, `system.searchInApp` **G**.
- `visualIntelligence.semanticContentSearch`. **R**.

### Tableau blanc

- `whiteboard.createBoard`, `whiteboard.createItem`, `whiteboard.deleteBoard`
  **G/A**, `whiteboard.deleteItem` **G/A**, `whiteboard.openBoard` **G/A**,
  `whiteboard.updateBoard`, `whiteboard.updateItem`. Les autres sont **R/A**.
- Objets : tableau, élément. **R/A**.

### Traitement de texte

- `wordProcessor.addAudioToPage`, `wordProcessor.addImageToPage`,
  `wordProcessor.addTextBoxToPage`, `wordProcessor.addVideoToPage`,
  `wordProcessor.addWebVideoToPage`, `wordProcessor.create`,
  `wordProcessor.createPage`, `wordProcessor.open` **G/A**,
  `wordProcessor.openPage` **G/A**. Les autres sont **R/A**.
- Objets : document, page, modèle **G/A**. Les autres sont **R/A**.

## Utilisation commerciale correcte

1. L'audit détermine le modèle de l'app et ses capacités réelles.
2. Le catalogue sélectionne seulement les lignes dont le contrat métier existe.
3. Chaque ligne suit la méthode agnostique et devient `validée`, `non adaptée`
   ou `bloquée` avec une preuve.
4. Les surfaces Siri AI, Spotlight et Raccourcis restent séparées dans l'offre.

Références : [Apple App Intents](https://developer.apple.com/documentation/appintents),
[OpenIntent](https://developer.apple.com/documentation/appintents/openintent),
[App schemas](https://developer.apple.com/documentation/appintents/app-schemas).
