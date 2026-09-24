# Catalogue App Intents et App Schemas, Xcode 27

Date de recherche : 2026-09-23. Ce document est un inventaire technique, pas
une promesse commerciale. Il sépare ce que le SDK expose, ce qu'Apple rend
accessible à Siri et Apple Intelligence, et ce qu'IntentLane sait réellement
générer aujourd'hui.

## Sources et méthode

* Référence fonctionnelle Apple : [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains), [App Intents](https://developer.apple.com/documentation/appintents/app-intents), et [Apple Intelligence and Siri AI](https://developer.apple.com/documentation/appintents/apple-intelligence-and-siri-ai).
* Les 180 noms d'actions ci-dessous proviennent de l'interface publique du SDK
  Xcode 27.0 (27A266a), vérifiée dans :
  `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks/AppIntents.framework/Versions/A/Modules/AppIntents.swiftmodule/arm64e-apple-macos.swiftinterface`.
  La même extraction sur le SDK iPhoneOS 27.0 donne le même catalogue.
* Apple précise qu'un schéma est un contrat de structure, pas une permission de
  réaliser une action arbitraire. Chaque app doit toujours exposer ses propres
  données, garde-fous, autorisations, interface de confirmation et logique
  métier.

## 1. Socle universel, réellement agnostique

Il n'existe pas de commande Siri générique qui puisse contrôler toute app. Le
socle réutilisable consiste à mapper le métier du client vers des entités et
des intents Apple :

| Primitive | Rôle | Disponibilité SDK |
| --- | --- | --- |
| `AppEntity` + `EntityQuery` / `EntityStringQuery` | Représenter un élément stable et résoudre un nom prononcé en un ou plusieurs choix. | macOS 13, iOS 16 |
| `DisplayRepresentation` | Donner à Siri/Spotlight un titre, sous-titre et image. Le système, et non l'app, choisit le rendu des cartes. | macOS 13, iOS 16 |
| `IndexedEntity` + `CSSearchableIndex` | Rendre un contenu autorisé trouvable dans Spotlight. | macOS 15, iOS 18 |
| `OpenIntent` + `.system.open` | Ouvrir **l'entité sélectionnée** dans l'app. C'est le parcours de sélection attendu, distinct d'une recherche. | schéma macOS/iOS 15 dans le SDK, parcours Siri AI à vérifier par OS cible |
| `ShowInAppSearchResultsIntent` + `.system.searchInApp` | Ouvrir la recherche interne de l'app. Apple le réserve au parcours de résultat interne, notamment quand la recherche retourne plus de dix résultats. | macOS 14.2, iOS 17.2 |
| `AppIntent`, paramètres, résultat, `AppShortcutsProvider` | Actions propres à une app, automatisables dans Raccourcis. Elles ne deviennent pas automatiquement des schémas Siri AI. | macOS 13, iOS 16 |
| `Transferable`, annotations de vues et donations | Contexte à l'écran, passage entre apps et pertinence. | varie selon API |

Références : [OpenIntent](https://developer.apple.com/documentation/appintents/openintent), [Entity queries](https://developer.apple.com/documentation/appintents/entity-queries), [Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight), [ShowInAppSearchResultsIntent](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent).

Pour une app qui n'appartient à aucun domaine métier Apple, les trois actions
génériques sont donc : `system.search`, `system.searchInApp`, `system.open`.
Le premier est le schéma générique de recherche, le second mène à une UI de
recherche de l'app, le troisième ouvre l'élément que la personne a choisi.

## 2. Catalogue Apple complet : 180 actions de schémas

Les domaines marqués **Siri AI** sont les domaines primaires de la
documentation Apple. Les domaines marqués **Raccourcis uniquement** ne doivent
jamais être vendus comme de la découverte Siri ou Apple Intelligence : Apple
dit explicitement qu'ils ne rendent pas les types découvrables par ces
surfaces. `Assistant` et `Visual Intelligence` sont des surfaces spécialisées,
pas des commandes vocales universelles.

### Domaines Siri AI

| Domaine | Actions SDK | Surface |
| --- | --- | --- |
| `system` | `search`, `searchInApp`, `open` | Siri AI, Apple Intelligence, recherche et ouverture génériques |
| `audio` | `addToLibrary`, `addToPlaylist`, `createStation`, `playAudio`, `recognizeAudio`, `updateAudioAffinity`, `warmupAudioQueue` | Siri AI |
| `calendar` | `createEvent`, `deleteEvent`, `updateEvent` | Siri AI |
| `camera` | `openInCaptureMode`, `setDevice`, `startCapture`, `stopCapture`, `switchDevice` | Siri AI |
| `clock` | `cancelTimer`, `createAlarm`, `createTimer`, `deleteAlarm`, `dismissAlarm`, `lapStopwatch`, `pauseTimer`, `resetStopwatch`, `resumeTimer`, `snoozeAlarm`, `startStopwatch`, `stopStopwatch`, `updateAlarm`, `updateTimer` | Siri AI |
| `mail` | `archiveMail`, `createDraft`, `deleteDraft`, `deleteMail`, `forwardMail`, `openDraft`, `openMessage`, `replyMail`, `saveDraft`, `sendDraft`, `updateDraft`, `updateMail` | Siri AI |
| `maps` | `reportIncident`, `shareETA`, `startNavigation`, `stopNavigation`, `stopShareETA`, `updateNavigationWaypoints` | Siri AI |
| `messages` | `draftMessage`, `editSentMessage`, `sendMessage`, `setMessageReadStatus`, `unsendMessage` | Siri AI |
| `notes` | `appendText`, `createNote`, `updateNote` | Siri AI |
| `phone` | `startCall` | Siri AI |
| `photos` | `addAssetsToAlbum`, `cleanupPhoto`, `copyEdits`, `createAlbum`, `createAssets`, `crop`, `deleteAlbum`, `deleteAssets`, `duplicateAssets`, `editAsset`, `openAlbum`, `openAsset`, `pasteEdits`, `postToSharedAlbum`, `removeAssetsFromAlbum`, `search`, `setDepth`, `setExposure`, `setFilter`, `setRotation`, `setSaturation`, `setWarmth`, `straighten`, `toggleDepth`, `toggleSuggestedEdits`, `updateAlbum`, `updateAsset`, `updateRecognizedPerson` | Siri AI |
| `reminders` | `createList`, `createReminder`, `createSection`, `deleteReminders`, `updateReminder` | Siri AI |

Les domaines `messages`, `audio`, `reminders`, `clock`, `notes`, `calendar`,
`phone` et `maps` sont annotés `anyAppleOS 27.0` dans le SDK. Les autres
domaines ci-dessus existent depuis des SDK précédents, mais une déclaration
doit encore respecter la disponibilité exacte de chaque type et plateforme.

### Surfaces spécialisées

| Domaine | Action | Portée |
| --- | --- | --- |
| `assistant` | `activate` | iOS 26.2 uniquement, activation d'une app conversationnelle via le bouton latéral au Japon. Pas macOS. |
| `visualIntelligence` | `semanticContentSearch` | iOS 26 et macOS 27, recherche depuis l'intelligence visuelle. Pas watchOS, tvOS ni visionOS. |

### Domaines Raccourcis uniquement

| Domaine | Actions SDK |
| --- | --- |
| `books` | `navigatePage`, `openBook`, `playAudiobook`, `search`, `updateCharacterSpacing`, `updateFontSize`, `updateLineSpacing`, `updateSettings`, `updateWordSpacing` |
| `browser` | `bookmarkTab`, `bookmarkURL`, `clearHistory`, `closeTabs`, `closeWindows`, `createTab`, `createWindow`, `deleteBookmarks`, `findOnPage`, `openBookmark`, `openURLInTab`, `search`, `switchTab` |
| `files` | `createFolder`, `deleteFiles`, `moveFiles`, `openFile`, `renameFile` |
| `journal` | `createAudioEntry`, `createEntry`, `deleteEntry`, `search`, `updateEntry` |
| `presentation` | `addAudioToSlide`, `addCommentToSlide`, `addImageToSlide`, `addTextBoxToSlide`, `addVideoToSlide`, `addWebVideoToSlide`, `create`, `createSlide`, `deleteSlide`, `open`, `openSlide`, `setSlideTitle`, `startPlayback`, `stopPlayback`, `update` |
| `reader` | `deletePages`, `enhanceDocuments`, `insertPages`, `openDocument`, `openPage`, `resizeDocuments`, `rotateDocuments`, `rotatePages`, `searchDocuments` |
| `spreadsheet` | `addAudioToSheet`, `addCommentToSheet`, `addImageToSheet`, `addTextBoxToSheet`, `addVideoToSheet`, `addWebVideoToSheet`, `create`, `createSheet`, `delete`, `deleteSheet`, `open`, `openSheet`, `update`, `updateSheet` |
| `whiteboard` | `createBoard`, `createItem`, `deleteBoard`, `deleteItem`, `openBoard`, `updateBoard`, `updateItem` |
| `wordProcessor` | `addAudioToPage`, `addImageToPage`, `addTextBoxToPage`, `addVideoToPage`, `addWebVideoToPage`, `create`, `createPage`, `open`, `openPage` |

Référence de classification : [App schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains). Les domaines sont techniquement dans le SDK macOS/iOS, mais leur classification Apple est ce qui fixe la promesse produit.

## 3. État précis d'IntentLane

| Niveau | Ce qui est couvert aujourd'hui | Conséquence |
| --- | --- | --- |
| Répertoire et validation | Les 180 noms d'actions SDK ci-dessus sont reconnus comme schémas Xcode 27. | IntentLane sait dire si une référence est connue, inconnue ou du mauvais type. |
| Génération avec contrat complet | 36 formes d'intent et 20 formes d'entité ont aujourd'hui un contrat de paramètres/protocoles dans `packages/core/src/app-schemas.ts`. | Elles peuvent être générées seulement si la config fournit les types, paramètres et propriétés exigés. |
| Pilote NetNewsWire | `system.open`, `system.searchInApp`, et l'action métier `mark article read`. | C'est le socle pertinent pour un lecteur RSS. Il n'existe pas de domaine Apple « RSS ». |
| Hors catalogue | Un `AppIntent` propre à l'app reste possible. | Il peut être disponible dans Raccourcis, mais ne doit pas être présenté comme un schéma Siri AI sans domaine Apple correspondant. |

Les 36 formes d'intent actuellement contractuelles sont :

`audio.createStation`, `camera.stopCapture`, `camera.switchDevice`,
`books.openBook`, `browser.switchTab`, `files.openFile`, `mail.openDraft`,
`mail.openMessage`, `photos.openAlbum`, `photos.openAsset`,
`presentation.open`, `presentation.openSlide`, `reader.openPage`,
`spreadsheet.open`, `spreadsheet.openSheet`, `system.open`,
`system.searchInApp`, `whiteboard.openBoard`, `wordProcessor.open`,
`wordProcessor.openPage`, `browser.deleteBookmarks`, `clock.deleteAlarm`,
`files.deleteFiles`, `journal.deleteEntry`, `mail.deleteDraft`,
`mail.deleteMail`, `photos.deleteAlbum`, `photos.deleteAssets`,
`presentation.deleteSlide`, `reader.deletePages`, `reader.rotatePages`,
`reminders.deleteReminders`, `spreadsheet.delete`,
`spreadsheet.deleteSheet`, `whiteboard.deleteBoard`, `whiteboard.deleteItem`.

Le chiffre est intentionnellement plus petit que 180 : le générateur refuse
plutôt que d'émettre du Swift qui compilerait sans avoir le contrat Apple
complet. C'est la frontière correcte entre un catalogue connu et une action
vendable.

## 4. Plan agnostique à appliquer à chaque client

1. **Inventorier les objets métiers** : données, identité stable, sensibilité,
   droits, accès hors ligne et destination UI.
2. **Mapper d'abord vers `system.open` et `system.search`** pour tout contenu
   ouvrable. Ajouter une entité, une résolution de texte exacte, une
   représentation visuelle, et l'indexation minimale autorisée.
3. **Choisir un domaine Apple uniquement si le métier correspond réellement**.
   Une app RSS ne devient ni Mail ni Reader pour gagner des verbes.
4. **Traiter les écritures comme risquées par défaut** : confirmation,
   idempotence, permissions, journal d'audit, annulation si possible. Ne pas
   indexer le contenu privé, les secrets ou les identifiants sensibles.
5. **Prouver chaque action séparément** : génération et métadonnées, test
   hors processus `AppIntentsTesting`, surface réelle (Siri, Spotlight ou
   Raccourcis), négatif, puis reproduction indépendante.

## 5. Entraînement NetNewsWire, catalogue réaliste

À tester progressivement, sans prétendre qu'il s'agit de schémas Apple RSS :

1. Rechercher des articles dans l'app (`system.searchInApp`).
2. Résoudre plusieurs articles portant un terme commun, les afficher comme
   choix Siri, puis ouvrir l'article choisi (`AppEntity` + `OpenIntent` +
   `system.open`).
3. Ouvrir un article par son titre exact, puis par un critère plus large.
4. Marquer lu et non lu, avec confirmation si le contexte l'exige.
5. Ajouter ou retirer une étoile, catégorie ou tag, si l'adaptateur NetNewsWire
   fournit une API métier fiable.
6. S'abonner à un flux, se désabonner, actualiser un flux, uniquement avec
   confirmation et journalisation, car ce sont des mutations de compte/données.
7. Ouvrir un flux, un dossier et une recherche enregistrée, tous via des
   entités distinctes et identifiants stables.

Les points 4 à 7 sont des actions propres au métier RSS, donc le bon véhicule
est d'abord `AppIntent` et `AppShortcutsProvider`. Ils ne deviennent une
capacité Siri AI que si un schéma Apple pertinent existe, ce qui n'est pas le
cas d'un schéma RSS dans Xcode 27.

## Décisions à conserver

* Ne jamais confondre une recherche qui remplit la barre de l'app avec
  l'ouverture de l'élément choisi. Ce sont deux intents et deux preuves.
* Ne jamais utiliser `reader.*` pour promettre Siri AI : Apple le classe
  Raccourcis uniquement.
* Ne jamais substituer un résultat « proche » à une entité absente : pour une
  demande inexistante, retourner zéro résultat et ne rien ouvrir.
* Les miniatures et la liste de sélection sont alimentées par
  `DisplayRepresentation`; leur apparence finale appartient à Siri.
