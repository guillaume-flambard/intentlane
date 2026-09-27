# Protocole d'acceptation manuel — Siri / Spotlight / Raccourcis (pilote NetNewsWire)

Date du protocole : 2026-09-23
Cible : macOS 27.0 (build 26A428)
App installée : `/Applications/NetNewsWire IntentLane Pilot.app` (bundle id `dev.memolabs.intentlane.NetNewsWire-Evergreen-DEBUG`)
Serveur de fixture : `127.0.0.1:8765` (doit répondre 200 sur `/pilot-feed.xml`)
Locale à consigner : fr (préciser la locale système réellement active)

Ce protocole est l'étape de preuve **humaine** du runbook. Les 22 tests App Intents
verts (2026-09-23_20-30-38) sont des tests de contrat hors processus ; ils ne
remplacent pas l'observation Siri/Spotlight faite par une personne.

## Ce qui est testable par la voix / la recherche, et ce qui ne l'est pas

| Surface | Actions réellement invocables | Actions NON invocables (entraînement uniquement) |
| --- | --- | --- |
| Siri AI (phrases du système) | rien de garanti sans schéma Apple ; seuls les raccourcis exposés répondent | toutes les mutations RSS |
| Raccourcis | `Open an article`, `Mark an article as read` (les 2 seuls raccourcis du profil pilote) | CreateFolder, RefreshFeed, MarkAllFeedArticlesRead, MoveFeed, AddLocalFeed, UnsubscribeFeed, DeleteFolder, OpenFolder |
| Spotlight | entité Article indexée (Alpha), entité Flux | rien d'autre |

Les actions d'entraînement (8 nouvelles capacités) **ne doivent pas être
cherchées dans Raccourcis ni demandées à Siri** : elles ne sont pas enregistrées
dans `AppShortcutsProvider`. Leur preuve est contractuelle (tests) + état visuel
dans l'application, pas Siri.

## Pré-requis (vérifiés le 2026-09-23)

- [x] App installée : `/Applications/NetNewsWire IntentLane Pilot.app`
- [x] Serveur fixture : `http://127.0.0.1:8765/pilot-feed.xml` → 200
- [x] Feed pilote « IntentLane NetNewsWire Pilot » présent dans le compte On My Mac
- [ ] App lancée au moins une fois après l'installation (index Spotlight des articles pilotes)

## Étapes (une ligne = une observation)

| # | Action | Consigne exacte | Résultat attendu | Réussi ? |
| --- | --- | --- | --- | --- |
| 1 | Ouvrir le feed pilote | Dans NetNewsWire, sidebar → « IntentLane NetNewsWire Pilot » | Alpha, Beta et Gamma sont présents dans le timeline | ☐ |
| 2 | Raccourcis | Ouvrir l'app Raccourcis, rechercher « NetNewsWire » | Exactement 2 actions : « Open article », « Mark an article as read », chacune avec un paramètre Article | ☐ |
| 3 | Spotlight | Rechercher `Alpha article about feed readers` | Le résultat est NetNewsWire (card Article) ; l'ouvrir → Alpha est sélectionné dans l'app | ☐ |
| 4 | Siri (ouvrir) | Dire « Open an article in NetNewsWire » | Siri propose un choix d'articles ; sélectionner Alpha → Alpha s'ouvre | ☐ |
| 5 | Siri (marquer lu) | Dire « Mark an article as read in NetNewsWire » | Siri propose un choix ; sélectionner Beta → Beta passe en lu (point plein) | ☐ |
| 6 | Siri (négatif) | Demander un article inventé (« an article called NothingHere ») | Aucun article ouvert ; Gamma n'est jamais sélectionné | ☐ |
| 7 | Second testeur | Reproduire les étapes 1 à 6 sur une session séparée | Mêmes résultats | ☐ |

## Détail des étapes critiques

### Étape 3 — Spotlight
Ne pas taper une recherche libre dans la barre de l'app : ce parcours-là
n'exerce pas `system.open`, il exerce `system.searchInApp` et atterrit sur la
liste interne. Le critère de l'étape 3 est la **card Spotlight** puis l'ouverture
de l'article **déjà choisi**.

### Étapes 4 et 5 — Siri
- Attendre la liste de sélection (Siri fournit les choix via `DisplayRepresentation` ;
  l'app ne contrôle pas le rendu des cartes).
- Ne pas utiliser de recherche en texte libre à la place : c'est un parcours
  `SearchInApp` distinct, qui doit être consigné comme tel s'il est testé.
- Consigner la langue Siri active (Système → Siri → Langue) à côté du résultat ;
  le protocole utilise des phrases anglaises.

### Étape 6 — Négatif
Un titre inventé doit retourner zéro choix et n'ouvrir **rien**. Un résultat
« proche » n'est pas un succès : l'entité absente retourne zéro.

## Fiche de consignation (une par session)

```
Date :
Testeur :
OS : macOS 27.0 (build 26A428)
Locale système :
Langue Siri :
Build de l'app (CFBundleShortVersionString) :
Résultats 1 à 6 : ☐☐☐☐☐☐
Observations / divergences :
```

## Limites à ne pas franchir

- Ne pas demander les actions d'entraînement (lignes 9-15 du backlog) à Siri ou
  dans Raccourcis : elles n'y sont pas, et ce n'est pas un bug.
- Ne pas conclure à un échec Spotlight si une requête terminale ne voit pas les
  donations : les donations App Intents ne sont pas inspectables en terminal.
- Ne pas modifier certificats, réglages macOS, VPN ni données utilisateur pour
  faire passer une observation.