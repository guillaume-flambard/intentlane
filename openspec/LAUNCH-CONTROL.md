# Contrôle de lancement IntentLane v1

Ce document est le tableau de bord de sortie. Une ligne n'est fermée que si
son artefact existe et satisfait le critère indiqué. Les capacités Apple 27
hors demande pilote ne sont pas des blockers v1; elles restent dans la colonne
post-launch.

## Blocking path

| Ordre | État actuel | Action | Critère de fermeture | Artefact attendu |
| --- | --- | --- | --- | --- |
| 0 | closed | Réconcilier les statuts de pilote et claims | Aucun document ne prétend Siri ou reproduction sans ledger valide | C0 et change pilote mis à jour (fait dans `983189f`) |
| 1 | code-ready | Ajouter `audit-diff` à l'échelle CI | Delta déterministe et `--fail-on regression` vert en CI | Module, commande et change `compare-audit-baselines` clos ; l'échelle CI reste à ajouter |
| 2 | closed | Livrer le validateur de ledger | `evidence validate --strict` refuse `unverified` | Module, commande et change `validate-pilot-evidence-ledger` clos |
| 3 | code-ready | Revalider Apple 27 et corriger les docs | SDK, disponibilité macOS/iOS et release notes liés; aucune doc périmée | Docs corrigés (`SPEC.md`) ; le catalogue et les fixtures de disponibilité restent à revalider |
| 4 | human-gate | Prouver NetNewsWire sur macOS | Trois parcours et négatifs Siri passés dans un ledger valide | Ledger macOS et delta d'audit |
| 5 | human-gate | Reproduction indépendante macOS | Seconde personne, checkout propre, succès et négatifs passés | Entrée de reproduction du ledger |
| 6 | human-gate | Prouver un pilote iOS | Build appareil, trois parcours, négatifs et comparaison macOS/iOS | Ledger iOS et delta |
| 7 | human-gate | Valider le quickstart | Personne externe, clone propre, moins de 30 minutes ou issue | Rapport de test externe |
| 8 | owner-decision | Publier npm | Nom/version confirmés, tarballs et installation registre vérifiés | Release npm et log d'installation |
| 9 | human-gate | Cohorte MVP | Cinq pilotes minimisés et consentis, dont deux apps existantes | Ledgers et registre de consentement |
| 10 | owner-decision | Ouvrir le canal public | Politiques OSS choisies, permissions d'études obtenues, landing revue contre les claims | Documents approuvés et revue landing |

## Post-launch, only with pilot demand

| Package Apple 27 | État | Déclencheur obligatoire |
| --- | --- | --- |
| Indexation complète, cycle de vie et requêtes distantes | non implémenté | Pilote qui requiert recherche sémantique ou données non indexables |
| `AppEnum(schema:)` et graphes de schéma complets | non implémenté | Domaine précis et parcours daté par un pilote |
| Transfert, `IntentValueRepresentation`, annotations d'écran | non implémenté | Parcours inter-apps avec source, destination et données nommées |
| Donations, `RelevantEntities`, ownership et sync | non implémenté | Parcours de personnalisation, partage ou synchronisation prouvé nécessaire |
| Collections, unions, `LongRunningIntent`, targets d'exécution | non implémenté | Action précise qui dépasse les capacités v1 et matrice cible |
| Plan d'actions MCP pour LLMs | spécifié, non implémenté | Pilote avec backend authentifiable et trois actions métier bornées |

La feuille de route MCP est [MCP-INTENTLANE-ROADMAP.md](MCP-INTENTLANE-ROADMAP.md).
Elle partage le contrat métier avec Apple, mais elle n'élargit pas la promesse
v1 avant les preuves de sécurité et de distribution qui lui sont propres.

## Verification command set

```sh
pnpm test
pnpm build
git diff --check
intentlane audit-diff baseline.json candidate.json --fail-on regression
intentlane evidence validate pilot-ledger.yaml --strict
```

Le dernier verdict est `GO` uniquement lorsque toutes les lignes 0 à 10 sont
fermées, ou qu'une ligne a été explicitement retirée de la promesse v1 avec la
landing et le registre de claims mis à jour.
