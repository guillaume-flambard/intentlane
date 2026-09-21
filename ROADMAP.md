# IntentLane — roadmap d'exécution

## Phase 0 — preuve technique (2–3 jours)

- Projet Swift/Expo minimal.
- Une `AppIntent` écrite à la main.
- Une phrase App Shortcut.
- Exécution `open_app` avec paramètre.
- Validation sur appareil réel.

**Gate :** arrêter si la cible Expo ne peut pas embarquer proprement les sources générées ou si l'expérience utilisateur n'est pas démontrable.

## Phase 1 — compilateur vertical (semaine 1)

- Monorepo pnpm. **fait**
- Schéma 0.1 et types Zod. **fait**
- `init`, `validate`, `generate`. **fait**
- Un paramètre `string`. **fait**
- Génération Swift snapshotée. **fait**
- Fixture Expo. **fait** (`apps/example-expo`, deux intents, en/fr)

**Gate :** même entrée = sortie byte-for-byte identique. **vérifié** par test, par `generate --check` et par deux prebuilds successifs (projet Xcode identique au bit près).

## Phase 2 — plugin Expo (semaine 2)

- Config plugin idempotent. **fait** : résolution portable du générateur depuis le projet consommateur, groupe `IntentLaneGenerated` créé une seule fois, ajout au target non répété.
- Copie des sources et ressources. **fait** : le Swift généré est enregistré dans la phase Sources, les tables `<locale>.lproj/IntentLane.strings` dans la phase Resources, et un prebuild réel a prouvé que la seconde exécution ne produit aucun doublon.
- `doctor`. **fait** : contrôles `node`, `config`, `schema`, `generated`, `xcode`, `plugin`.
- Deep links sûrs. **partiel** : les URLs sont construites via `URLComponents` et les query triées, le routage côté app n'existe pas encore.
- EAS development build documenté. **fait** : section « Running on a device » du README, parcours local `expo run:ios` et parcours EAS `eas build --profile development`, avec la raison native (Expo Go ne peut pas exécuter les App Intents générées).

**Gate :** un utilisateur externe suit le quickstart en moins de 30 minutes. **pas encore mesuré** ; le quickstart `init` vers build simulateur est reproductible ici.

## Phase 3 — vrai MVP (semaines 3–4)

- Types primitifs et enums. **fait** : `string`, `integer`, `number`, `boolean`, `date`, `datetime` et `enum` sont générés, avec `AppEnum` et libellés de cas localisés dans la table `IntentLane`, conversions de query par type, et contrôles IL1301 et IL1401. Prouvé par compilation `swiftc` et par un build simulateur de `apps/example-expo`.
- App Entities statiques/endpoint.
- Localisation en/fr.
- Confirmation et politique de risque.
- Résultat/dialogue et snippet simple.
- CI macOS et matrice Xcode minimale.
- Exemple Kollio-like.

**Gate :** cinq pilotes, dont deux apps existantes.

## Phase 4 — bêta open source (semaines 5–6)

- Documentation publique.
- CLI publiée sur npm.
- Plugin `@intentlane/expo`.
- Diagnostics stables.
- Guide de migration.
- Collecte volontaire de feedback.

## Phase 5 — validation commerciale

- Audit payant pour agences/apps.
- Interview des pilotes.
- Mesure des erreurs CI récurrentes.
- Landing page et liste d'attente Pro.

Ne construire le dashboard que si les utilisateurs réclament historique, équipes ou matrice de builds.

## Backlog post-MVP

- Suggestions d'intentions par analyse du repo.
- Android App Actions.
- Flutter et Capacitor.
- RelevantEntities/EntityCollection/SyncableEntity.
- Long-running intents et annulation.
- Test runner de formulations.
- Policies organisationnelles.
- Dashboard de compatibilité.
- Adaptateur Navirox officiel.

## Premier ordre de tickets

1. `chore: scaffold pnpm monorepo` **fait**
2. `feat(schema): define schema 0.1` **fait**
3. `feat(core): parse and normalize config` **fait**
4. `feat(core): stable diagnostics` **fait**
5. `feat(apple): emit minimal AppIntent` **fait**
6. `test(apple): add golden Swift snapshots` **fait**
7. `feat(cli): implement init validate generate` **fait**
8. `feat(expo): add generated sources config plugin` **fait** (résolution portable, idempotence testée, prebuild réel vérifié)
9. `feat(example): create Expo create-idea demo` **fait** (`apps/example-expo`, typecheck et prebuild verts)
10. `feat(cli): implement doctor` **fait**
11. `docs: publish 15-minute quickstart` **fait** (README racine et README de l'exemple), la mesure du gate reste à faire

Ticket suivant : `feat(apple): emit App Entities for static and endpoint queries`.

