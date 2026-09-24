# Catalogue des App Schemas pour les pilotes IntentLane

Ce document est la grille de choix d’un pilote. Il liste les schémas que le
compilateur IntentLane sait actuellement valider et générer à partir de la
table Xcode 27. Il ne faut pas confondre « présent dans le SDK » avec « bon
choix produit » ou « parcours Siri déjà prouvé ».

La liste lisible de toutes les références Apple connues, y compris celles qui
ne sont pas encore générables, se trouve dans
[APPLE-SCHEMA-REFERENCE.md](APPLE-SCHEMA-REFERENCE.md). Cette page reste la
vue de décision du générateur, pas un inventaire marketing.

## Comment lire le catalogue

- **Siri AI primaire** : surface à privilégier pour une nouvelle intégration
  macOS/iOS 27 quand le modèle métier la justifie.
- **Domaine métier** : schéma spécialisé, à adopter seulement si l’objet de
  l’app correspond réellement à son contrat Apple.
- **Automatisation seulement** : Apple ne l’utilise pas pour la découverte Siri
  AI. Il ne doit jamais être présenté comme équivalent.
- **Générable** : IntentLane connaît la forme Swift exigée aujourd’hui. Les
  autres références connues du SDK restent volontairement bloquées jusqu’à ce
  que leur contrat exact soit implémenté et compilé.

## Première option pour une app de contenu

| Schéma | Catégorie | Forme générée | Usage de pilote |
| --- | --- | --- | --- |
| `system.searchInApp` | Siri AI primaire | `StringSearchCriteria`, handler natif | Recherche dans l’UI existante, sans fallback sur un objet différent. |
| `system.open` | Siri AI primaire | entité cible `IndexedEntity` | Ouvrir une entité résolue avec un ID stable et un routeur app-owned. |

`system.search` est déprécié sur macOS/iOS 27 : employer
`system.searchInApp`. Les deux schémas ci-dessus sont le bon paquet initial
pour NetNewsWire, pas le domaine Reader.

## Schémas générables aujourd’hui

| Domaine | Schémas d’intention | Entités associées générables | Position pilote |
| --- | --- | --- | --- |
| System | `system.searchInApp`, `system.open` | Entité applicative non spécialisée | Prioritaire pour contenu général. |
| Audio | `audio.createStation` | `ambientSound`, `artist`, `liveRadioStation`, `newsProvider`, `podcastCollection`, `podcastShow`, `radioShow`, `songCollection`, `warmupAudioQueueResult` | Siri AI primaire si l’app est réellement audio. |
| Camera | `camera.stopCapture`, `camera.switchDevice` | aucune | Action native, à évaluer comme sensible. |
| Books | `books.openBook` | aucune dans le compilateur actuel | Domaine spécialisé. |
| Browser | `browser.switchTab`, `browser.deleteBookmarks` | `tabGroup` | Domaine spécialisé. |
| Clock | `clock.deleteAlarm` | aucune | Action de suppression, confirmation à prévoir. |
| Files | `files.openFile`, `files.deleteFiles` | aucune | Domaine sensible, comptes et suppression. |
| Journal | `journal.deleteEntry` | aucune | Automatisation seulement. |
| Mail | `mail.openDraft`, `mail.openMessage`, `mail.deleteDraft`, `mail.deleteMail` | `account` | Domaine sensible. |
| Notes | aucune intention générable aujourd’hui | `account` | Le SDK connaît plus d’actions, leur forme n’est pas encore générée. |
| Photos | `photos.openAlbum`, `photos.openAsset`, `photos.deleteAlbum`, `photos.deleteAssets` | aucune | Données privées, validation forte. |
| Presentation | `presentation.open`, `presentation.openSlide`, `presentation.deleteSlide` | `document`, `template` | Automatisation seulement. |
| Reader | `reader.openPage`, `reader.deletePages`, `reader.rotatePages` | `page` | Automatisation seulement, exclu du pilote Siri AI. |
| Reminders | `reminders.deleteReminders` | aucune | Action de suppression. |
| Spreadsheet | `spreadsheet.open`, `spreadsheet.openSheet`, `spreadsheet.delete`, `spreadsheet.deleteSheet` | `document`, `template` | Automatisation seulement. |
| Whiteboard | `whiteboard.openBoard`, `whiteboard.deleteBoard`, `whiteboard.deleteItem` | aucune | Automatisation seulement. |
| Word processor | `wordProcessor.open`, `wordProcessor.openPage` | `template` | Automatisation seulement. |

## Références SDK connues mais non encore générées

Le catalogue Xcode 27 contient aussi des actions de création, mise à jour,
recherche spécialisée, navigation, lecture et partage dans Audio, Books,
Browser, Calendar, Clock, Files, Journal, Mail, Maps, Messages, Notes, Phone,
Photos, Reader, Reminders, Spreadsheet, Whiteboard et Word Processor. Elles
ne sont pas toutes un engagement produit : IntentLane les reconnaît pour
donner un diagnostic, mais refuse une configuration dont il ne sait pas
encore produire la forme exacte. La liste machine-source complète est
[`packages/core/src/app-schemas.ts`](packages/core/src/app-schemas.ts).

Avant d’ajouter l’une d’elles, il faut : vérifier la disponibilité de la
plateforme cible dans le SDK, compiler un probe avec le macro Fix-It Xcode,
mettre à jour la table et les tests, puis prouver le parcours réel.

## Couverture totale pour NetNewsWire : ce que cela veut dire

Pour ce premier pilote, « couverture totale » ne signifie pas déclarer tous les
schémas Apple. Cela signifie couvrir les capacités honnêtes de l’application :

1. rechercher un article avec `system.searchInApp` ;
2. ouvrir exactement un article avec `system.open` ;
3. ne rien résoudre ni ouvrir pour un titre inventé ;
4. indexer, mettre à jour et supprimer uniquement les articles approuvés ;
5. traiter toute action d’écriture, telle que marquer comme lu, comme un lot
   séparé avec risque, confirmation et preuve propres.

Le schéma Reader et les App Shortcuts peuvent être ajoutés ultérieurement si
NetNewsWire veut explicitement l’automatisation, mais ils ne ferment pas le
gate Siri AI.
