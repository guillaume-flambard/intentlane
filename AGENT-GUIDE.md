# IntentLane — guide pour agent de code

## Programme Siri 27

Pour les tâches d'audit d'applications existantes, App Schemas, Siri, Apple
Intelligence, macOS 27, iOS 27, pilotes externes ou mise sur le marché, lire :

1. `APPLE-27-APP-INTENTS-RESEARCH.md`
2. `AUDITOR-SPEC.md`
3. `SIRI-27-ROADMAP.md`
4. `PILOT-PLAYBOOK.md`
5. `COMMERCIAL-READINESS.md`

Ce programme complète le MVP Expo historique ci-dessous. Il vise d'abord les
applications macOS et iOS existantes et les App Schemas validés par Apple.

## Mission

Construire la plus petite tranche verticale permettant à une app Expo d'exposer une App Intent Apple générée depuis `intentlane.yaml`.

## Contraintes

- TypeScript strict, zéro `any` non justifié.
- Compilation déterministe ; aucun LLM dans le chemin de build.
- Ne jamais écrire hors des fichiers possédés par le générateur.
- Ne jamais stocker de secret dans la configuration.
- Toute nouvelle syntaxe commence par le schéma, les tests invalides et l'IR.
- Toute génération Swift possède un golden snapshot.
- Toute mutation Expo est testée deux fois pour prouver l'idempotence.
- Pas de dashboard, base de données, auth SaaS, Flutter ou Android avant le gate MVP.

## Ordre de travail

1. Lire `PRD.md`, `SPEC.md`, `ARCHITECTURE.md`, puis `ROADMAP.md`.
2. Créer le monorepo décrit sans ajouter de services.
3. Implémenter le schéma minimal de l'exemple.
4. Écrire les tests de parsing et diagnostics avant le générateur.
5. Générer une App Intent Swift minimale.
6. Compiler la fixture Apple.
7. Intégrer le plugin Expo.
8. Prouver le parcours complet sur appareil/simulateur.

## Definition of done par PR

- Tests verts.
- Typecheck vert.
- Aucun snapshot mis à jour sans explication.
- Documentation de toute option publique.
- Erreur utilisateur actionnable.
- Pas d'élargissement de scope implicite.

## Interdictions MVP

- Inventer une abstraction multi-plateforme non exercée.
- Exécuter arbitrairement du JavaScript depuis une intention en arrière-plan.
- Modifier directement un `.pbxproj` sans passer par l'abstraction choisie et ses tests.
- Promettre des analytics que Siri ne fournit pas.
- Indexer des données privées par défaut.

## Prompt de démarrage

```text
Implement Phase 1 of IntentLane following ROADMAP.md.
Treat SPEC.md as normative and PRD.md as product authority.
Start with the schema, invalid fixtures and normalized IR.
Do not implement dashboard, Android, Flutter or AI discovery.
Stop after the CLI can generate deterministic Swift for the reference fixture,
then report tests, open risks and the exact next vertical slice.
```
