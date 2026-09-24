# Pilote IINA — preuve locale (2026-09-23)

IINA est le second candidat de banc d'essai (après NetNewsWire) dans
[PUBLIC-PILOT-CANDIDATES.md](PUBLIC-PILOT-CANDIDATES.md). Cette page est une
preuve locale d'entraînement : elle n'autorise aucun contact, aucune PR, aucune
revendication. IINA impose un Design Proposal issue avant tout changement
d'UI et la divulgation de l'usage d'IA dans toute PR (voir son
[CONTRIBUTING](https://github.com/iina/iina/blob/develop/CONTRIBUTING.md)).

## Audit (lecture seule)

`intentlane audit /tmp/il-pilot/iina/iina --platform macos`

- score **0/100** (bande `none`) — aucune capacité App Intents détectée ;
- route `native (high)` ; données `public (privacy unknown)` ;
- architecture `local (high)` — média local, aucune donnée de compte ;
- conditions 5/9 enregistrées ; qualité 0/5 signaux ; catalogue 27.0 ;
- 4 targets Xcode, 1 pour macOS ; licence GPLv3.

## Périmètre proposé (non soumis)

Retrouver et ouvrir un **fichier média local** autorisé : ID stable, entité
`media_file`, `system.open` pour l'ouverture exacte, `open_app` pour la
navigation par route. Aucune indexation de chemins sensibles, artwork, tokens
ou métadonnées média sans politique écrite ; nom inconnu = zéro résultat, aucune
navigation.

## Contrat pilote

`/tmp/il-pilot/iina-pilot/intentlane.yaml` (schéma 0.1, app
`dev.memolabs.intentlane.iina-pilot`, min_ios 27.0) :

| Intent | Surface | Exécution |
| --- | --- | --- |
| `open_media_file` | `schema: system.open` (OpenIntent) | native, cible `media_file` |
| `open_media` | `open_app` (route `/open`) | entité `media_file` en paramètre |
| `resume_playback` | `open_app` (route `/play`) | sans paramètre |

## Commandes de preuve exécutées

```sh
# génération (Swift + manifeste + squelette d'adaptateur application-owned)
pnpm exec tsx packages/cli/src/index.ts generate \
  -c /tmp/il-pilot/iina-pilot/intentlane.yaml \
  -o /tmp/il-pilot/iina-pilot/out \
  --adapter-output /tmp/il-pilot/iina-pilot/IinaPilotAdapter.swift

# compilation macOS 27
cd /tmp/il-pilot/iina-pilot/out
xcrun --sdk macosx swiftc -target arm64-apple-macos27.0 -sdk "$(xcrun --sdk macosx --show-sdk-path)" \
  -module-name IINA_Pilot -emit-const-values \
  -const-gather-protocols-list protocols.json \
  -c IntentLaneGenerated.swift -o IntentLaneGenerated.o

# extraction des métadonnées App Intents (basename, pas chemin absolu)
printf 'IntentLaneGenerated.swift\n' > sources.txt
printf 'IntentLaneGenerated.swiftconstvalues\n' > constvals.txt
appintentsmetadataprocessor --output metadata --toolchain-dir <toolchain> \
  --module-name IINA_Pilot --sdk-root "$(xcrun --sdk macosx --show-sdk-path)" \
  --xcode-version 27A266a --platform-family macOS --deployment-target 27.0 \
  --target-triple arm64-apple-macos27.0 --source-file-list sources.txt \
  --swift-const-vals-list constvals.txt --force

# portes de vérification
intentlane verify -c /tmp/il-pilot/iina-pilot/intentlane.yaml \
  -o /tmp/il-pilot/iina-pilot/out \
  --metadata /tmp/il-pilot/iina-pilot/out/metadata/Metadata.appintents
```

## Résultats observés

- Génération : `IntentLaneGenerated.swift` + manifeste + `IinaPilotAdapter.swift`
  (2.3K, squelette avec TODOs) — l'adaptateur exige au moins un intent à schéma
  système (IL1501 sinon).
- Compilation : OK (constvalues 62.2K) sur `arm64-apple-macos27.0`.
- Métadonnées extraites : `OpenMediaFile` porte le protocole système
  `OpenIntent` + `AssistantIntent` (surface Siri AI par schéma), `OpenMedia`
  porte `outputFlags 7` (dialog + snippet + URL). L'entité
  `IntentLaneMediaFileEntity` et sa query sont présentes.
- `intentlane verify` : `contract pass`, `generated pass`, `metadata pass` ;
  seule `applicationTests` manque — c'est le test métier application-owned que
  l'équipe IINA remplirait (le squelette est fourni).

## Piège documenté

`appintentsmetadataprocessor` résout les sources par **basename** : les fichiers
`sources.txt` / `constvals.txt` doivent contenir le nom de fichier seul
(`IntentLaneGenerated.swift`), pas un chemin absolu, sinon erreur
« Unable to find matching source file ».

## Revue du 2026-09-23

La chaîne génération, compilation et métadonnées est valable, mais elle ne
constitue pas une intégration IINA. La vérification relancée donne
`applicationTests: missing`, puis `blocked`. Le fichier
`IinaPilotAdapter.swift` est un squelette avec des `TODO` et n'est pas ajouté à
la cible Xcode : il ne recherche pas l'historique et ne peut ouvrir aucun média.

Le prochain travail est donc l'adaptateur réel, documenté dans
[PILOT-IINA-DISCOVERY.md](PILOT-IINA-DISCOVERY.md) : brancher uniquement
`HistoryController`, l'écran d'historique existant et
`PlayerCore.activeOrNew.openURL`. Ensuite seulement, ajouter ce code à la cible,
écrire les tests métier, puis exécuter `intentlane verify` avec `--app-test`.

Aucun contact, aucune PR et aucune revendication publique n'ont été faits.

## Adaptateur réel et tests métier (2026-09-23)

Le contrat a été recadré sur le vrai pilote (`played_media`, schémas
`system.searchInApp` + `system.open`) et l'adaptateur réel est branché dans une
copie de travail isolée d'IINA (branche `intentlane/pilot-playedmedia`,
`/tmp/il-pilot/iina`).

Fichiers ajoutés/modifiés dans la copie IINA :

- `iina/IntentLane/PlayedMediaCore.swift` — noyau pur, testable : mapping
  historique → entité sans exposer de chemin, titre = titre stocké sinon nom de
  fichier, sous-titre = type de média + date, résolution insensible à la casse
  et aux diacritiques, homonymes conservés, fichier supprimé non ouvrable,
  cycle de vie d'index (clear/disable/suppression).
- `iina/IntentLane/PlayedMediaAdapter.swift` — glue app-owned : résolveur qui lit
  `HistoryController.shared.history` (gardé par `recordPlaybackHistory`),
  ouverture exacte via `PlayerCore.activeOrNew.openURL`, handler
  `system.searchInApp` qui ouvre la fenêtre History, index Spotlight nommé.
- `iina/IntentLane/IntentLaneGenerated.swift` — couche générée par IntentLane.
- `iina/HistoryWindowController.swift` — `applySearch(_:)`, entrée minimale pour
  le handler de recherche.

Tests métier (`/tmp/il-pilot/iina-pilot/tests/`, commande `run-tests.sh`) :
**18/18 verts** — mapping sans chemin, titre stocké/nom, type audio/vidéo,
homonymes, casse, diacritiques, requête vide, fichier supprimé, historique vidé,
et mapping partagé (ordre, règle unique, fichier disparu exclu).

`intentlane verify` avec `--app-test "bash .../run-tests.sh"` :

```
pass  contract: pass
pass  generated: pass
pass  applicationTests: pass
pass  metadata: pass
pending  liveEvidence: not-requested
awaiting-live-evidence: Record independently reproduced live Spotlight and Siri evidence before claiming certification.
```

Métadonnées extraites : `OpenPlayedMedia` porte les protocoles système
`OpenIntent` + `AssistantIntent` + `OpenEntity` (surface Siri AI par schéma).

## Branchement à l'exécution (2026-09-24)

L'adaptateur compilait mais n'était jamais enregistré : les résolveurs de
l'entité et les deux handlers restaient `nil`, donc toute requête renvoyait zéro
entité et `perform()` levait `missingHandler`. Une revue a aussi relevé que
l'état d'index était mémorisé dans `UserDefaults` (dérive possible), que le
mapping historique vers enregistrement était écrit trois fois, et que les
fichiers du pilote étaient rangés dans le groupe Xcode `Views`.

Ce qui a changé dans la copie de travail IINA :

- `iina/AppDelegate.swift` : `applicationDidFinishLaunching` enregistre
  l'adaptateur sous `if #available(macOS 27.0, *)` puis déclenche un premier
  rafraîchissement d'index. Sans cet appel, le pilote reste inerte.
- `iina/IntentLane/PlayedMediaAdapter.swift` : `IntentLanePlayedMediaHistory`
  devient l'unique source d'historique pour le résolveur, l'ouverture et
  l'index, via `PlayedMediaCore.records(from:fileExists:)`. L'ouverture d'un
  identifiant inconnu, l'historique désactivé et le fichier supprimé
  remontent tous à `nil` par la même règle, donc jamais de substitut.
- Cycle de vie de l'index : observation de `iinaHistoryUpdated`,
  `iinaHistoryTaskFinished` et de la clé `recordPlaybackHistory`. Chaque
  rafraîchissement supprime le type puis réindexe l'historique ouvert, au lieu de
  recalculer un ensemble périmé. App Intents n'offre en macOS 27 que
  `indexAppEntities`, `deleteAppEntities(identifiedBy:ofType:)` et
  `deleteAppEntities(ofType:)` : aucune lecture de l'index n'est possible, donc
  aucune liste d'identifiants n'est mémorisée, ni dans `UserDefaults` ni ailleurs.
  La dérive est impossible par construction.
- `iina.xcodeproj/project.pbxproj` : groupe `IntentLane` dédié, les trois
  fichiers ne sont plus dans `Views`.

Preuves observées :

- Build IINA `BUILD SUCCEEDED` sur le SDK macOS 27 (build 26A428).
- Sonde d'exécution : drapeau `…played_media.registered` supprimé, app lancée,
  drapeau relu à `1` après 3 s, processus encore vivant à 10 s, aucun rapport de
  crash IINA. La sonde est
  `defaults read com.colliderli.iina dev.memolabs.intentlane.iina-pilot.played_media.registered`.
- Métadonnées ré-extraites : `OpenPlayedMedia` porte toujours
  `OpenIntent` + `AssistantIntent` + `OpenEntity`, et
  `IntentLanePlayedMediaEntity` est toujours présent.
- `intentlane verify` : `contract`, `generated`, `applicationTests`, `metadata`
  au vert, `liveEvidence: not-requested`, statut `awaiting-live-evidence`
  inchangé.

## Portes automatiques prouvées (2026-09-24, suite)

La revue avait constaté que les portes 3 et 4 n'étaient prouvées nulle part : aucun test ne
touchait `PlayerCore` ni `CSSearchableIndex`. Ce qui a changé :

- `iina/IntentLane/PlayedMediaCore.swift` : ajout de la seam `IINAPlaybackOpening` et de
  `PlayedMediaOpen.perform(identifier:inputs:recordingEnabled:fileExists:player:)`. C'est la
  décision d'ouverture qui est testée, avec un double enregistreur. L'adaptateur ne réimplémente
  plus la décision : il fournit `HistoryController`, `Preference`, `FileManager` et un joueur
  `@MainActor` qui transmet à `PlayerCore.activeOrNew.openURL`.
- `iina/IntentLane/PlayedMediaIndex.swift` : l'enveloppe d'index est extraite dans un fichier
  sans dépendance IINA, avec un nom d'index paramétré par défaut. C'est ce qui permet de la
  tester contre un vrai index nommé sans cible de test Xcode.
- La commande `--app-test` est désormais `tests/run-all-tests.sh`, qui enchaîne les deux suites.

Résultats observés :

- Noyau pur : **26/26 verts**, dont ouverture valide appelée une seule fois avec l'URL exacte,
  identifiant inconnu, fichier supprimé et enregistrement désactivé qui lèvent tous une erreur
  sans aucun appel.
- Index : **7/7 verts** contre un vrai `CSSearchableIndex` nommé
  `dev.memolabs.intentlane.iina-pilot.tests.played_media`, vidé avant et après le run. Le type
  d'entité généré est accepté, la suppression du type réussit et réussit une seconde fois sur un
  index vide, et un cycle complet suppression puis index réussit.
- Sonde d'exécution : `resolver true, open true, search true` au log de lancement, puis
  `indexed 0 item(s)`, donc le premier rafraîchissement s'est exécuté. Le drapeau n'est plus écrit
  que si les trois registres sont non nuls, donc sa lecture ne peut pas tromper.
- `intentlane verify` : `contract`, `generated`, `applicationTests`, `metadata` au vert ;
  `liveEvidence: not-requested`, statut `awaiting-live-evidence`.

Ce que la porte ne prouve toujours pas, et qui est écrit tel quel : App Intents et Core Spotlight
n'offrent aucune lecture d'un index nommé, donc le test d'index prouve les appels, pas le contenu
résultant. La règle sur les entités qui doivent être indexées reste prouvée par les tests du
mapping pur. Les surfaces Siri et Spotlight restent hors de toute porte automatisée, et
l'enregistrement est prouvé par sonde, pas par la commande de test.
## Contrat d'entité tranché (2026-09-24)

Deux points divergeaient entre la spec et le code. Ils sont tranchés et verrouillés par des tests.

**Identifiant.** IINA ne fournit que `mpvMd5`, qui pour un fichier local vaut
`url.path.md5`. L'identifiant est donc opaque, stable entre deux lancements et
sur un changement de titre, et n'est pas stable sur un déplacement ou un
renommage. Décision : garder ce hash, écrire son enveloppe exacte, et amender la
spec au lieu de promettre une stabilité qui n'existe pas. Les deux autres pistes
ont été écartées : un hash de contenu obligerait à lire les octets du média, à
ajouter de l'état et à collisionner sur deux copies identiques ; un store d'UUID
indexé par le hash de chemin ne corrige pas le déplacement, puisque la clé de
recherche reste le chemin.

Le comportement sûr est testé : après un déplacement, l'ancien identifiant ne
résout rien, l'ouverture échoue, aucun autre média n'est ouvert à la place, et le
rafraîchissement d'index suivant republie le média sous son nouvel identifiant.

**Sous-titre.** Décision : le type de média seul. La date de dernière lecture change
à chaque relecture, donc un sous-titre daté rendrait l'enregistrement Spotlight
mutable sur l'événement d'historique le plus fréquent, et la récence est déjà
portée par l'ordre des enregistrements. La spec du pilote est amendée avec cette
raison, et `PlayedMediaRecord.lastPlayed` reste une donnée qui n'est pas affichée.

La décision de sous-titre vit dans un seul endroit testé,
`PlayedMediaCore.subtitle(for:)`, et la construction d'entité passe par
`IntentLanePlayedMediaEntity.from(_:)`. Le noyau est passé de 26 à 37
vérifications, dont l'enveloppe d'identifiant et la conséquence sûre d'un
déplacement.

Reste à faire, non fait et non revendiqué : les portes live (Spotlight `Aurora`,
Siri avec choix d'homonyme, titre inventé, fichier supprimé, reproduction par un
second testeur). Aucun contact, aucune PR, aucune revendication.
