# IntentLane, spécifications de clôture

## Définition de « 100 % »

La clôture couvre la promesse actuellement déclarée : audit local, compilation
déterministe, intégration Apple, parcours Siri macOS 27 et iOS 27 reproduits,
publication bêta et offre commerciale bornée par ces preuves. Elle ne couvre
pas chaque domaine App Schema, Android, Flutter, Capacitor, un dashboard ou
Observe : ces éléments sont hors périmètre ou demand-gated.

Un item n'est clos que si son critère de fermeture est atteint. Un subagent ne
peut pas simuler une preuve humaine, une permission de client ou une décision
du propriétaire.

## Incohérence à corriger en premier

`PILOT-NETNEWSWIRE.md` et `prove-macos-siri-journey/tasks.md` disent que Siri
manuel et la reproduction indépendante sont ouverts. La case 2.2 cochée dans
`validate-public-macos-pilots/tasks.md` est donc prématurée. C0 doit rouvrir
cette case, ou joindre le ledger qui la justifie. Les métadonnées et tests ne
prouvent jamais Siri.

## Carte complète

| ID | Spécification | État | OpenCode | Fermeture |
| --- | --- | --- | --- | --- |
| C0 | Réconcilier les statuts du pilote macOS | prêt | oui | Les tâches, roadmap, ledger et registre de claims ne se contredisent plus. |
| C1 | Diff de baselines d'audit | prêt | oui | `audit-diff` est déterministe et bloque une régression en CI. |
| C2 | Ledger de preuve pilote | prêt | oui | `evidence validate --strict` calcule correctement `verified`. |
| P1 | Preuve Siri NetNewsWire | gate humain | non | Trois parcours et négatifs observés sur macOS 27 dans un ledger valide. |
| P2 | Reproduction indépendante macOS | gate humain | non | Une seconde personne rejoue P1 depuis un checkout propre. |
| P3 | Second pilote macOS | mixte | partiellement | FSNotes ou un remplaçant qualifié apporte une seconde preuve indépendante. |
| P4 | Pilote iOS 27 | mixte | partiellement | Build device, trois parcours, Siri manuel et delta macOS/iOS. |
| P5 | Cohorte MVP | gate humain | non | Cinq pilotes dont deux applications existantes sont consignés. |
| R1 | Quickstart externe | gate humain | non | Une personne externe le termine en moins de 30 minutes. |
| R2 | Publication npm et release bêta | mixte | partiellement | CLI et plugin sont publiés et réinstallés depuis le registre. |
| R3 | Référence CLI publique | prêt | oui | Toute option et tout code public est documenté et testé. |
| O1 | Intake, triage et politiques open core | décision requise | après décision | Les politiques approuvées, templates et responsables existent. |
| M1 | Études de cas et landing | preuves et permissions | partiellement | Une étude macOS et une iOS autorisées respectent le registre de claims. |
| A1 | Indexed entities et queries | demand-gated | après pilote | Cycle de vie, confidentialité et preuve de surface sont livrés. |
| A2 | Transfer, relevance, sync, ownership | demand-gated | après pilote | Un package indépendant est prouvé par capacité. |
| A3 | Rich values, collections, exécution longue | demand-gated | après pilote | Un package indépendant est prouvé par capacité. |

## C0. Réconcilier les statuts

Mettre en cohérence les tâches, `PILOT-NETNEWSWIRE.md`,
`CLAIMS-REGISTRY.md` et `ROADMAP.md`. Toute preuve manuelle requiert dans le
ledger : observation, date, build OS, locale, permissions, fixture, phrase,
résultat attendu et négatif. Fermeture : recherche des statuts NetNewsWire sans
contradiction, claims non prouvés toujours non publiables et `git diff --check`.

## C1. Diff de baselines d'audit

Spécification normative :
[compare-audit-baselines](changes/compare-audit-baselines/proposal.md).
Implémenter le module profond `audit-diff` et
`intentlane audit-diff <baseline> <candidate>`, après des fixtures progression,
régression, ajout, disparition,
`both`, JSON invalide et version incompatible. Jointure par `(platform,
capability)`, absence non classée, contexte SDK/catalogue/conditions séparé.
Diagnostics `ILA170` à `ILA172`, sorties texte et JSON, `--fail-on regression`.

## C2. Ledger de preuve pilote

Spécification normative :
[validate-pilot-evidence-ledger](changes/validate-pilot-evidence-ledger/proposal.md).
Implémenter un validateur YAML local, sans driver Siri ni interprétation de
captures. Chaque parcours requiert contrat et build, plus les surfaces
revendiquées. Une action risquée requiert confirmation, authentification et
ownership. `verified` exige aussi une reproduction indépendante passée.
Diagnostics `ILA173` à `ILA175`, formats texte/JSON et `--strict` sont requis.

## P1-P2. Preuve et reproduction macOS

Précondition : C0 et C2 clos. Rejouer le fork NetNewsWire avec les fixtures
RSS : trouver Alpha, ouvrir Alpha, marquer Beta lu, négatif Gamma et reset.
Consigner commandes, artefacts, conditions, phrases, résultats attendus et
observés. P1 ferme lorsque chaque surface revendiquée est `pass`. P2 ferme
lorsqu'une seconde personne rejoue au moins un succès et un négatif par parcours
depuis un checkout propre. Échec ou blocage reste `unverified`, jamais marketing.

## P3. Second pilote macOS

Après l'état terminal NetNewsWire, évaluer FSNotes : licence, révision épinglée,
build local, fixture sans identifiants, baseline dans les trois formats et
find/open/safe append. S'il échoue la matrice, conserver le motif et sélectionner
un remplaçant public. Fermeture : baseline, delta, tests, métadonnées, surfaces,
Siri manuel et reproduction sont liés à un ledger, avec les règles d'audit
réutilisables comparées à NetNewsWire.

## P4-P5. iOS et cohorte MVP

P4 sélectionne une application publique avec target iOS natif, build development
ou signé sur appareil, jamais Expo Go. Elle garde une fixture locale, les
conditions device et compte, trois parcours et leurs négatifs. Fermeture : Siri
manuel iOS passe et la comparaison macOS/iOS isole une règle d'audit ou un
adapter réutilisable. P5 ferme avec cinq pilotes minimisés et consentis, dont
deux applications existantes. Les pilotes non vérifiés restent du feedback.

## R1-R3. Mise à disposition

R1 fait suivre le README depuis un dossier propre par une personne externe,
sans assistance, et enregistre durée, environnement, `doctor` et déviations.
Le gate passe sous 30 minutes ou produit une issue reproductible.

R2 attend que le propriétaire npm s'authentifie et confirme version et nom. Un
subagent prépare `npm pack`, vérifie le tarball et les notes de release. Après
publication, un dossier vierge installe les deux paquets depuis le registre et
exécute `init`, `validate`, `generate`, le prebuild Expo et `doctor`.

R3 crée une référence CLI issue de `--help`, couvrant commandes, formats, codes
`IL` et `ILA`, versions et exemples exécutés en CI. Elle ne présente pas
`migrate`, HTTP, endpoint queries, enum schemas ou packages avancés comme livrés.

## O1. Open core

Le propriétaire doit choisir avant toute écriture : canal et délai de sécurité,
mainteneurs et droits de décision, règle de conduite, cadence/versioning de
release, labels et SLA triage. Après ces décisions, un subagent clôt
[prepare-open-core-readiness](changes/prepare-open-core-readiness/proposal.md)
avec templates, labels et politiques approuvées. Fermeture : responsables nommés
et parcours contribution réel depuis un clone propre.

## M1. Études de cas et landing

Préconditions : P2, P4 et autorisation écrite des propriétaires d'apps. Chaque
étude cite plateforme, OS, Xcode, surfaces observées, conditions et limites.
La landing ne reprend que les claims publiables. Fermeture : permissions et
ledgers référencés, review de landing archivée contre le registre. Cette tâche
clôt [package-validated-service](changes/package-validated-service/proposal.md).

## A1-A3. Capabilités avancées

Elles ne font pas partie de la clôture de la promesse actuelle. Commencer
uniquement avec une demande pilote écrite qui nomme parcours, plateforme et
données. Créer alors un OpenSpec par package, jamais un drapeau YAML générique.

A1 définit syntaxe, IR, adapter client, indexer-mettre à jour-supprimer-
réindexer, consentement, manifeste de confidentialité, fixtures,
`AppIntentsTesting`, métadonnées, audit et matrice macOS/iOS.

A2 se découpe en quatre packages : Transferable/handoff, annotations/donations,
entités pertinentes, sync/ownership. A3 se découpe en enum schema et valeurs
riches, unions/collections, travail long/annulation/targets. Chaque package
ferme avec syntaxe/migration, diagnostics, fixtures négatives, snapshots Swift,
SDK annoncé, audit des prérequis et preuve système.

## Ordre de délégation

1. C0 seul, puis C1 et C2 séquentiellement car ils modifient les diagnostics
   `ILA` et le contrat d'audit.
2. R3 peut avancer en parallèle, mais documente C1/C2 seulement après livraison.
3. P1 à P5 et R1 demandent une personne et un appareil. OpenCode prépare les
   commandes et fixtures, il ne les atteste pas.
4. R2 attend npm, O1 les décisions écrites, M1 les preuves et permissions.
5. A1-A3 attendent une demande pilote et ne retardent pas la clôture définie ici.

## Definition of done commune

Chaque spec de code exige tests ajoutés avant implémentation, `pnpm test`,
`pnpm build`, contrôles Swift concernés et `git diff --check`. Chaque spec de
preuve exige ledger valide, artefacts reproductibles, claim mis à jour, seconde
personne ou autorisation explicite lorsque requis.
