# NetNewsWire pilot — qualification

- **Application**: NetNewsWire, a macOS RSS/feed reader
- **Revision**: `0184ca38`, tag `v8.0`, shallow clone, no submodules
- **Licence**: BSD-3-Clause
- **Platform audited**: macOS
- **Selected because**: NetNewsWire is a mature Swift-native macOS application with a
  clean MVC architecture, full-text search, and a reading surface that maps naturally
  to `system.open` and `system.searchInApp`. Its search controller and reading pane
  are the two seams the adapter needs.

## Structure de l'application (lecture)

| Composant | Rôle | Fichier |
| --- | --- | --- |
| `Article` | Modèle de données principal | `app/Model/Article.swift` |
| `Feed` | Conteneur d'articles | `app/Model/Feed.swift` |
| `FeedItem` | Données brutes | `app/Model/FeedItem.swift` |
| `SearchController` | Moteur de recherche | `app/Search/SearchController.swift` |
| `ReaderViewController` | Paneau de lecture | `app/MainView/ReaderViewController.swift` |
| `MasterFeedViewController` | Vue liste des articles | `app/MainView/MasterFeedViewController.swift` |

### Article

- `guid` (hash-based stable identifier, déterministe)
- `title`
- `author`, `link`, `summary`, `content`

L'index expose seulement `guid`, `title` et `feed.name`. Pas de contenu, pas de link,
pas de summary. Le guid est l'identifiant.

### SearchController

- `SearchController.search(string, ArticleArray)` — prend une query et un périmètre
- `SearchController.articlesMatchingSearch(string)` — retourne un tableau

## Sensibilité

NetNewsWire lit des articles de sources variées. Le corps d'un article (content) est
le payload sensible. L'index expose uniquement le title et le feed name — rien
d'autre. La règle d'exclusion `source_disabled` empêche d'offrir des articles d'un
feed qui n'a jamais synced.

## Claims

| Claim | Preuve | Statut |
| --- | --- | --- |
| `contract` | YAML valide, `intentlane validate` | ✅ |
| `generated` | Swift compilable, `intentlane generate --check` | 🔄 |
| `applicationTests` | 24 tests pure logique | 🔄 |
| `integrationTests` | 30 tests avec AppIntents SDK | 🔄 |
| `metadata` | `Metadata.appintents` contient les 3 actions et 1 entité | 🔄 |
| `indexSync` | Index CoreSpotlight, 9 tests cycle de vie | 🔄 |
| `siri-conversation` | Observation directe, besoin humain + écran | 📋 |
| `spotlight-ui-result` | Observation directe, besoin humain + écran | 📋 |