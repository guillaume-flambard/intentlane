# NetNewsWire: preuve machine versionnée, 2026-10-02

## Portée

Ce relevé décrit seulement les claims du paquet versionné
[`pilots/netnewswire/pilot.yaml`](../../pilots/netnewswire/pilot.yaml):
`contract`, `generated` et `metadata`. Le README du paquet décrit la
reproduction et les commandes. Cette preuve machine n'est pas une observation
Siri, Spotlight ou Shortcuts.

La reproduction cible le commit NetNewsWire
`0184ca38c586078117a21f96f68eef78d39b8f68` (tag `v8.0`). L'intégration
IntentLane est appliquée au clone de travail produit sous `.build/`; le dépôt
source amont n'est pas modifié par le paquet versionné.

## Résultats observés

- `sh pilots/netnewswire/reproduce.sh` a récupéré le commit épinglé, généré le
  Swift, appliqué les hooks, construit l'application et terminé avec
  `REPRODUCE_EXIT=0`. Le processeur a écrit `Metadata.appintents`.
- Le contrôle de métadonnées a trouvé les actions
  `MarkArticleRead`, `OpenArticle` et `SearchArticles`, l'entité
  `IntentLaneArticleEntity` et sa query. Il a terminé avec
  `metadata surface OK: 3 actions, 1 entity, 1 query`.
- Une exécution indépendante de
  `sh pilots/netnewswire/tests/run-all-tests.sh` a terminé les gates `contract`,
  `generated` et `metadata`, puis a affiché `ok all machine gates`.

- La commande publique `verify --pilot pilots/netnewswire/pilot.yaml --strict`
  a terminé avec le code 0 et certifié exactement `contract`, `generated`
  et `metadata`. Le journal est `intentlane-verify-strict.log`.

Les journaux de cette exécution sont des pièces locales hors dépôt, sous
`projects/_reports/cuesheet-intentlane-supervision-2026-10-02/`:

- `IL-VERIFY-02/reproduce.log`: commit et génération aux lignes 4-22, succès
  du build et vérification des métadonnées aux lignes 12859-12868.
- `intentlane-independent-machine-tests.log`: les trois gates et leur résultat
  aux lignes 1-12.

La reproduction a réutilisé le workspace `.build/netnewswire` existant. Elle
prouve le résultat de cette exécution au commit épinglé, pas une reconstruction
depuis un workspace vierge. Le journal contient aussi des avertissements de
création de liens `pnpm` vers un artefact `dist` absent; la génération, le build
et les contrôles consignés ensuite ont néanmoins abouti. Ces avertissements ne
sont pas convertis en claim supplémentaire.

Le contrôleur a aussi rapporté, comme contexte d'initialisation, une fixture
HTTP 200 avec trois articles et Beta non lu. Ce contexte n'est pas un claim de
`pilot.yaml` et n'élargit pas les critères d'acceptation machine. Le ledger
racine `PILOT-NETNEWSWIRE-LEDGER.yaml` conserve son observation 26A428, où Beta
était lu; ce relevé machine ne modifie pas cet état historique.

## Ce que ces résultats ne prouvent pas

- Les suites historiques `applicationTests`, `integrationTests` et `indexSync`
  ne sont pas versionnées dans ce paquet. Aucun résultat de métadonnées ne les
  remplace; leurs anciens nombres de tests sont retirés de la qualification et
  ces suites ne sont pas revendiquées.
- La validation du contrat ne prouve pas le comportement des règles déclarées
  `source_disabled` et `item_missing`. Le vérificateur de métadonnées confirme
  les actions, l'entité, sa query et la présence du titre; il ne prouve ni la
  résolution exacte à l'exécution, ni l'exclusion de toutes les propriétés
  sensibles, ni le cycle de vie de l'index.
- Le build et les métadonnées ne prouvent ni une interaction Siri, ni un
  résultat visible dans Spotlight, ni une action Shortcuts observée par une
  personne.
- La gate humaine 4 reste ouverte. `HUMAN-GATES-PREP.md` demande les étapes 1 à
  6 sur macOS 27.0.1 build 26A434.
- La gate humaine 5 reste ouverte jusqu'à une reproduction par une seconde
  personne après la gate 4, depuis un checkout propre et sur une session
  distincte, comme le demande le contrôle de lancement.
- L'observation historique macOS 27.0 build 26A428 reste inchangée dans le
  ledger racine `PILOT-NETNEWSWIRE-LEDGER.yaml` et dans le protocole existant.
  Ce relevé ne crée ni ne modifie d'observation humaine.

## Référence à la proposition ASRi active

Les exigences proposées pour ASRi sont décrites dans la spécification delta active
[`add-asri-adapter-templates`](../../openspec/changes/add-asri-adapter-templates/specs/asri-adapter-templates/spec.md).
Ce changement OpenSpec n'est pas terminé: ses tâches inachevées ne sont pas
promues en promesse normative par les résultats NetNewsWire. La preuve
ci-dessus établit uniquement les trois claims machine déclarés par `pilot.yaml`.
