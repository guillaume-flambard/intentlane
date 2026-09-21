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
- App Entities statiques/endpoint. **fait** pour `static` : l'entité génère une `AppEntity`, une `EntityQuery` et un protocole de résolution que l'application implémente et enregistre dans `IntentLaneEntityResolvers`, les paramètres `entity` référencent une entité par id et envoient `<valeur>.id` dans la query, `display.title` et `display.subtitle` nomment les propriétés affichées, et les titres d'entité alimentent la table `IntentLane`. `query.mode: endpoint` est refusé en IL1401 (pas de réseau généré). Prouvé par `swiftc` et par un build simulateur Release où `extract.actionsdata` contient l'entité, sa requête et le paramètre typé.
- Localisation en/fr. **fait** : `title` et `prompt` d'un paramètre sont localisés dans la table `IntentLane` (le `title` alimente aussi le nom du type d'un `enum`), avec repli sur l'identifiant brut quand aucun `title` n'est déclaré, et IL1201 si la locale par défaut manque. Prouvé par `swiftc`, par un build simulateur Release, et par `extract.actionsdata` où chaque paramètre porte un `title.key` localisé (par exemple `Idea title`, `Due date`, `Priority`) au lieu de son identifiant.
- Confirmation et politique de risque. **fait** : `confirmation: always` génère un `requestConfirmation` avant l'action, `authentication: required` et `none` génèrent une `authenticationPolicy` explicite, `inherited` n'émet rien, et `confirmation_prompt` alimente le dialogue et la table `IntentLane` (repli sur le titre de l'intention). Prouvé par `swiftc`, par un build simulateur Release, et par `extract.actionsdata` où `DeleteIdea` porte `authenticationPolicy: 1` avec `isAuthPolExplicit: true` alors que les autres intentions restent à `0`.
- Résultat/dialogue et snippet simple. **fait** : `perform()` retourne `ProvidesDialog & ShowsSnippetView & OpensIntent`, une vue `IntentLaneSnippetView` est déclarée une fois par fichier et affiche le titre de l'intention plus une ligne par paramètre (conversion identique à la query, libellés dans la table `IntentLane`, aucune ligne pour une intention sans paramètre). Prouvé par `swiftc`, par un build simulateur Release, et par `extract.actionsdata` où `outputFlags` passe de `5` à `7` pour les quatre intentions quand la conformance est ajoutée.
- CI macOS et matrice Xcode minimale. **fait** : `.github/workflows/ci.yml` a quatre jobs. `checks` (ubuntu) enchaîne installation depuis le lockfile, typecheck, tests, validate, régénération, échec si périmé, et une seconde génération dans `/tmp` comparée par `diff -r` pour prouver le déterminisme byte pour byte. `swift` compile le Swift généré des deux fixtures avec `swiftc` contre le SDK simulateur sur `macos-15` et `macos-26` (Xcode 16.4 contre Xcode 26.4.1, versions imprimées par chaque run). `macos` (macos-26) exécute `node apps/example-macos/verify.mjs` : génération du contrat macOS, compilation pour le SDK macOS du runner, extraction des métadonnées avec `appintentsmetadataprocessor`, puis assertions sur les actions, les flags, la politique d'authentification, l'entité, la requête, l'enum et les raccourcis ; le script lit la version du SDK et le build de Xcode sur la machine, donc il s'adapte au toolchain du runner. `simulator` (macos-26) fait un `expo prebuild`, construit l'app Release avec `xcodebuild`, puis lit `Metadata.appintents/extract.actionsdata` et la table `fr.lproj/IntentLane.strings` du produit et vérifie les quatre actions, `outputFlags: 7`, la politique d'authentification explicite de `DeleteIdea`, l'entité et sa requête, les raccourcis enregistrés, et deux traductions.
- Exemple Kollio-like. **fait** : `apps/example-expo` est devenu Kollio, une petite liste d'idées qui déclare quatre intentions (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), une entité `idea`, et du contenu en/fr. L'écran affiche les idées et route les URLs que les intentions ouvrent : création depuis la query, ouverture, suppression. L'analyseur d'URL et le routeur vivent dans `apps/example-expo/src` et sont couverts par 16 tests unitaires, et `vitest.config.ts` inclut désormais `apps/*/src/**/*.test.ts`. Le défaut cosmétique qui ajoutait un `?` final à une URL sans query est corrigé dans le générateur (la query n'est posée que si elle est non vide), prouvé par compilation et exécution de `IntentLaneRoute.make`. Prouvé par un build simulateur Release installé et lancé : l'écran affiche le titre Kollio, le bandeau de dernière route et les trois idées du seed.
- Résolveur d'entité enregistré par l'exemple. **fait** : un plugin de config local (`apps/example-expo/plugins/withIdeaResolver.cjs`, déclaré avec son extension car Expo résout une référence fichier par un `require.resolve` nu qui n'essaie pas `.cjs`) écrit `IdeaResolver.swift` et l'ajoute à la phase Sources, fusionne `IntentLaneEntityResolverRegistration.register()` dans `AppDelegate.swift` après `bindReactNativeFactory(factory)` dans un bloc `@generated`, et enregistre `IntentLaneEntityResolvers.idea` sur le main actor au lancement. Le transport est `Settings` de React Native vers `NSUserDefaults` sous la clé `intentlane.ideas`, publiée par `App.tsx` à chaque changement. Prouvé par 11 tests unitaires du plugin, par un prebuild réel idempotent (pbxproj, AppDelegate et `IdeaResolver.swift` identiques au second run), par un build Release qui réussit, par la lecture du plist de l'app qui contient les trois idées publiées, et par une sonde Swift exécutée qui décode ces données et sert `suggestedIdeaEntities()` et `ideaEntities(for:)`.

**Gate :** cinq pilotes, dont deux apps existantes.

## Phase 3 bis : cible macOS 27

Objectif : prouver que la sortie d'IntentLane n'est pas liée à iOS et qu'elle alimente le nouveau Siri sur macOS, où une app sans App Intents reste invisible aux actions in-app d'Apple Intelligence.

- Exemple macOS versionné et vérifié en CI. **fait** : `apps/example-macos` contient un contrat dédié (`dev.intentlane.shelf`, quatre intentions `open_shelf`, `save_link`, `open_link`, `delete_link`, une entité `link`, locales en/fr), la liste de protocoles attendue par le compilateur (`protocols.json`, la même que le `<Module>_const_extract_protocols.json` produit par Xcode) et `verify.mjs`, un script Node sans dépendance qui enchaîne génération, compilation et extraction sans projet Xcode. La recette est établie : `swiftc -target arm64-apple-macos<version>` avec **les deux** flags `-emit-const-values` et `-const-gather-protocols-list <json>` (sans le second, aucun `.swiftconstvalues` n'est écrit et le processeur refuse de tourner), puis `appintentsmetadataprocessor` avec `--platform-family macOS`, `--source-file-list` et `--swift-const-vals-list`. Prouvé par un run complet : les quatre actions, `outputFlags: 7` sur chacune, `DeleteLink` seule avec `authenticationPolicy: 1` et `isAuthPolExplicit: true`, `IntentLaneLinkEntity`, `IntentLaneLinkQuery`, `IntentLaneSaveLinkTag` et trois raccourcis. Le même fichier Swift, sans une ligne modifiée, produit donc des métadonnées App Intents complètes sur macOS comme sur iOS.
- Conformances de schéma (`@AppIntent(schema:)`, `@AppEntity(schema:)`, `@AppEnum(schema:)`). **à faire** : c'est le trou que la preuve macOS a chiffré, `systemProtocols`, `assistantDefinedSchemas` et `assistantDefinedSchemaTraits` étant vides sur les quatre actions. Conformer une intention à un domaine connu (Notes, Mail, Reminders, Files, Calendar, etc.) est ce qui débloque les capacités d'action étendues de Siri, et c'est du boilerplate déterministe, donc exactement le travail d'un compilateur de contrat.

## Phase 4 — bêta open source (semaines 5–6)

- Documentation publique. **partiel** : le dépôt est public et sous licence MIT, avec `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` et `AGENT-GUIDE.md` dans le dépôt. Il n'y a pas encore de site de documentation ni de référence CLI publiée.
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

Ticket suivant : `feat(apple): conform intents and entities to assistant schemas`.

