# IntentLane Client-Ready v1: périmètre et critères de sortie

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
   (`@memolabs-apps/intentlane-expo`), adaptateur exemple (`plugins/withIdeaResolver.cjs`),
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
| E4 | Porte `applicationTests` : manquante sans `--app-test`, exécute la commande applicative | exercice `verify` (applicationTests pass avec `--app-test=true`, missing sans) |
| E5 | Porte `metadata` lit `Metadata.appintents` / `extract.actionsdata` | exercice `verify` (metadata pass) ; job CI `macos` et `simulator` |
| E6 | Une revendication observée reste en attente sans ledger vérifié, et n'est jamais lue quand elle n'est pas revendiquée | `intentlane verify --claim siri-conversation` → `pending-evidence` ; `intentlane evidence validate --strict` ; `packages/core/src/pilot-ledger.test.ts`, `packages/core/src/release-verification.test.ts` |
| E7 | Parcours natif complet : audit → contrat → génération → adaptateur → test → verify | `apps/example-macos` + `verify.mjs` (métadonnées extraites, Xcode 27A266a) |
| E8 | Parcours Expo/RN : plugin idempotent, adaptateur exemple, tests de route, build simulateur, métadonnées | tests ciblés du plugin et du routeur, job CI `simulator` |
| E9 | Suite complète verte | workflow CI public : typecheck, suite automatisée, validation, déterminisme, compilation Swift, extraction des métadonnées et build simulateur |
| E10 | Documentation client présente et alignée sur les vraies commandes | `CLIENT-READY-V1.md`, `CLIENT-QUICKSTART.md`, `AUTOMATED-VERIFICATION.md`, `MANUAL-SIRI-ACCEPTANCE.md` |

## Bloqueurs réels vers une v1 commercialisable

1. **Publication npm** : le CLI `@memolabs-apps/intentlane@0.1.0` est publié.
   `main` prépare `0.2.0-next.0`, et le plugin Expo reste non publié tant qu'une
   release taguée n'a pas été décidée et vérifiée depuis son tarball.
2. **Gate utilisateur externe Quickstart** (R1) : le parcours en moins de 30
   minutes n'a pas encore été mesuré par une personne externe.
3. **Preuve de répétition** (P3/P5) : la répétition de la méthode doit rester
   liée aux pilotes certifiés sur les revendications déterministes, au journal
   de déviations et à la mesure d'effort par étape. Voir
   `openspec/changes/validate-five-public-pilots`.
4. **Preuve système observée** (P1/P2) : ce n'est pas un bloqueur de livraison,
   mais cette preuve n'est pas établie. Ces revendications doivent être demandées
   explicitement avec `--claim siri-conversation --strict`, et le ledger reste
   `unverified` tant que personne n'a observé le parcours. Aucun pilote ne la
   réclame par défaut, donc la livraison n'en dépend pas et aucune formulation
   ne doit prétendre le contraire.

## Définition de done

Chaque critère E1 à E10 est clos uniquement avec la preuve listée, rejouable sur
un checkout propre. Un critère humain n'est clos que par une personne ; un
subagent ne peut pas l'attester.
