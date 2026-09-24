# IntentLane Client-Ready v1 — périmètre et critères de sortie

Date : 2026-09-23. Cette spec définit ce qu'une équipe cliente doit pouvoir
installer et vérifier sans dépendre de Guillaume. Chaque critère est vérifiable
par une commande ou un artefact ; rien n'est coché sans preuve.

## Règle de vérité

La conversation visuelle Siri n'est **jamais** automatisée : Apple ne fournit
pas d'API publique fiable pour la piloter et la lire dans un test de production.
Tout ce qui précède l'est : audit, contrat, génération, adaptation, compilation,
extraction de métadonnées, tests métier, CI et contrôle de preuves. L'app
cliente fournit son mapping métier, ses règles d'accès et son routeur de
navigation ; IntentLane ne les devine jamais.

## Périmètre « Client-Ready v1 »

Inclus :

1. **Parcours natif** : `intentlane audit` (lecture seule), `intentlane init`,
   `intentlane generate` (Swift + `<locale>.lproj` + manifeste), `generate
   --adapter-output` (squelette d'adaptateur application-owned avec TODOs),
   `intentlane verify` et `verify --strict`, exemple macOS sans projet Xcode
   (`apps/example-macos`, `verify.mjs`).
2. **Parcours Expo / React Native** : plugin config idempotent
   (`@intentlane/expo`), adaptateur exemple (`plugins/withIdeaResolver.cjs`),
   tests de route (`apps/example-expo/src/routes.test.ts`), build simulateur,
   métadonnées App Intents vérifiées (`Metadata.appintents/extract.actionsdata`).
3. **CI client** : une commande unique `intentlane verify --strict` qui échoue
   clairement si le contrat, la génération, les tests métier, le build ou les
   métadonnées manquent.
4. **Contrôle de preuves** : `intentlane evidence validate --strict` (ledger),
   `intentlane audit-diff` (régression en CI), registre de claims et de
   statuts.
5. **Documentation client** : spec v1, Quickstart, protocole de preuve visuelle
   Siri/Spotlight à deux testeurs.

Exclu (hors périmètre ou demand-gated) : automatisation de l'écran Siri,
endpoint queries, exécution `http`, enum schemas, packages avancés
(transfer/donation/relevance/sync), dashboard, Android.

## Critères de sortie vérifiables

| ID | Critère | Preuve |
| --- | --- | --- |
| E1 | `intentlane verify --strict` existe et sort non nul quand une porte échoue | CLI `packages/cli/src/index.ts` (commandes `verify`, option `--strict`) ; exécution non-strict et strict sur `apps/example-macos` |
| E2 | Porte `contract` passe/fail sur YAML valide/invalide | `intentlane validate` + diagnostics `IL` ; sortie de `verify` |
| E3 | Porte `generated` échoue quand la sortie est périmée ou modifiée à la main | `generate --check` (IL1701) ; exercice `verify` sur `build/studio` périmé → `generated: fail` |
| E4 | Porte `applicationTests` : manquante sans `--app-test`, exécute la commande applicative | exercice `verify` (applicationTests pass avec `--app-test "true"`, missing sans) |
| E5 | Porte `metadata` lit `Metadata.appintents` / `extract.actionsdata` | exercice `verify` (metadata pass) ; job CI `macos` et `simulator` |
| E6 | Porte `liveEvidence` : ledger non `verified` sans reproduction indépendante | `intentlane evidence validate --strict` ; `packages/core/src/pilot-ledger.test.ts` |
| E7 | Parcours natif complet : audit → contrat → génération → adaptateur → test → verify | `apps/example-macos` + `verify.mjs` (métadonnées extraites, Xcode 27A266a) |
| E8 | Parcours Expo/RN : plugin idempotent, adaptateur exemple, tests de route, build simulateur, métadonnées | tests plugin (11+16), `routes.test.ts` (14), job CI `simulator` |
| E9 | Suite complète verte | `pnpm test` (318 tests), `pnpm build`, `pnpm validate`, `generate --check`, probe `swiftc`, `node apps/example-macos/verify.mjs` |
| E10 | Documentation client présente et alignée sur les vraies commandes | `CLIENT-READY-V1.md`, `CLIENT-QUICKSTART.md`, `AUTOMATED-VERIFICATION.md`, `MANUAL-SIRI-ACCEPTANCE.md` |

## Bloqueurs réels vers une v1 commercialisable

1. **Publication npm** : `@intentlane/cli` et `@intentlane/expo` sont prêts
   (`npm pack` vérifié) mais non publiés — `npm whoami` répond 401 Unauthorized
   sur cette machine. Bloquant livraison, pas produit.
2. **Gate humain Quickstart** (R1) : personne externe < 30 min non mesuré.
3. **Preuves Siri/Spotlight visuelles** (P1/P2) : ne sont **pas** automatisables
   ; elles exigent observation réelle et reproduction par un second testeur
   avant toute revendication. Le ledger reste `unverified` sans cela.
4. **Second pilote** (P3) et **cohorte** (P5) : FSNotes ou remplaçant qualifié,
   cinq pilotes consentis, non atteints.

## Définition de done

Chaque critère E1–E10 est clos uniquement avec la preuve listée, rejouable sur
un checkout propre. Un critère humain n'est clos que par une personne ; un
subagent ne peut pas l'attester.