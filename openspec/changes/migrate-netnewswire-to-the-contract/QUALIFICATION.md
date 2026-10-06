# NetNewsWire pilot - qualification

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

- `SearchController.search(string, ArticleArray)` - prend une query et un périmètre
- `SearchController.articlesMatchingSearch(string)` - retourne un tableau

## Sensibilité

NetNewsWire lit des articles de sources variées. Le contrat déclare l'identifiant,
le titre et le nom du feed pour l'entité, et exclut le corps et les URL des champs
déclarés. Il déclare aussi les règles `source_disabled` et `item_missing`. Ces
déclarations ne prouvent pas le comportement réel de l'index: les gates
versionnées valident le contrat, sa génération et les métadonnées, pas les règles
d'exposition à l'exécution, la résolution exacte ou le cycle de vie de l'index.

## Claims machine versionnés

Le manifeste `pilots/netnewswire/pilot.yaml` déclare exactement les trois
claims ci-dessous. Résultats et limites: [preuve machine du 2026-10-02](../../../docs/pilots/PILOT-NETNEWSWIRE-MACHINE-EVIDENCE-2026-10-02.md).

| Claim | Gate versionné | Statut |
| --- | --- | --- |
| `contract` | `bash tests/run-contract-tests.sh` | ✅ Vérifié le 2026-10-02 |
| `generated` | `bash tests/run-generated-tests.sh` | ✅ Vérifié le 2026-10-02 |
| `metadata` | `bash tests/run-metadata-tests.sh` | ✅ Vérifié le 2026-10-02 |

## Hors du claim set courant

Les anciennes suites `applicationTests`, `integrationTests` et `indexSync`
étaient dans un fork jetable et ne sont pas versionnées dans le paquet actuel.
Elles restent non prouvées et non revendiquées. Les anciens nombres associés à
ces suites ne sont pas des résultats validés et sont retirés de cette
qualification.

Les interactions Siri et le résultat visible dans Spotlight restent des gates
humaines. La gate 4 attend les étapes manuelles 1 à 6 sur macOS 27.0.1 build
26A434; la gate 5 attend ensuite un second testeur indépendant. L'observation
historique macOS 27.0 build 26A428 est conservée sans modification.
