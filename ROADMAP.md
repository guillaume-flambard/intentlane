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
- CI macOS et matrice Xcode minimale. **fait** : `.github/workflows/ci.yml` a quatre jobs. `checks` (ubuntu) enchaîne installation depuis le lockfile, typecheck, tests, validate, régénération, échec si périmé, et une seconde génération dans `/tmp` comparée par `diff -r` pour prouver le déterminisme byte pour byte. `swift` compile le Swift généré des deux fixtures avec `swiftc` contre le SDK simulateur sur `macos-15` et `macos-26` (Xcode 16.4 contre Xcode 26.4.1, versions imprimées par chaque run). `macos` (`xcode-27`, seule image hébergée qui fournit Xcode 27 et donc le SDK macOS 27) exécute `node apps/example-macos/verify.mjs` : génération du contrat macOS, compilation pour le SDK macOS du runner, extraction des métadonnées avec `appintentsmetadataprocessor`, puis assertions sur les actions, les flags, la politique d'authentification, l'entité, la requête, l'enum et les raccourcis ; le script lit la version du SDK et le build de Xcode sur la machine, donc il s'adapte au toolchain du runner, et il échoue avec un message actionnable si ce toolchain précède Xcode 27. `simulator` (macos-26) fait un `expo prebuild`, construit l'app Release avec `xcodebuild`, puis lit `Metadata.appintents/extract.actionsdata` et la table `fr.lproj/IntentLane.strings` du produit et vérifie les quatre actions, `outputFlags: 7`, la politique d'authentification explicite de `DeleteIdea`, l'entité et sa requête, les raccourcis enregistrés, et deux traductions.
- Exemple Kollio-like. **fait** : `apps/example-expo` est devenu Kollio, une petite liste d'idées qui déclare quatre intentions (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), une entité `idea`, et du contenu en/fr. L'écran affiche les idées et route les URLs que les intentions ouvrent : création depuis la query, ouverture, suppression. L'analyseur d'URL et le routeur vivent dans `apps/example-expo/src` et sont couverts par 16 tests unitaires, et `vitest.config.ts` inclut désormais `apps/*/src/**/*.test.ts`. Le défaut cosmétique qui ajoutait un `?` final à une URL sans query est corrigé dans le générateur (la query n'est posée que si elle est non vide), prouvé par compilation et exécution de `IntentLaneRoute.make`. Prouvé par un build simulateur Release installé et lancé : l'écran affiche le titre Kollio, le bandeau de dernière route et les trois idées du seed.
- Résolveur d'entité enregistré par l'exemple. **fait** : un plugin de config local (`apps/example-expo/plugins/withIdeaResolver.cjs`, déclaré avec son extension car Expo résout une référence fichier par un `require.resolve` nu qui n'essaie pas `.cjs`) écrit `IdeaResolver.swift` et l'ajoute à la phase Sources, fusionne `IntentLaneEntityResolverRegistration.register()` dans `AppDelegate.swift` après `bindReactNativeFactory(factory)` dans un bloc `@generated`, et enregistre `IntentLaneEntityResolvers.idea` sur le main actor au lancement. Le transport est `Settings` de React Native vers `NSUserDefaults` sous la clé `intentlane.ideas`, publiée par `App.tsx` à chaque changement. Prouvé par 11 tests unitaires du plugin, par un prebuild réel idempotent (pbxproj, AppDelegate et `IdeaResolver.swift` identiques au second run), par un build Release qui réussit, par la lecture du plist de l'app qui contient les trois idées publiées, et par une sonde Swift exécutée qui décode ces données et sert `suggestedIdeaEntities()` et `ideaEntities(for:)`.

**Gate :** cinq pilotes, dont deux apps existantes.

## Phase 3 bis : cible macOS 27

Objectif : prouver que la sortie d'IntentLane n'est pas liée à iOS et qu'elle alimente le nouveau Siri sur macOS, où une app sans App Intents reste invisible aux actions in-app d'Apple Intelligence.

- Exemple macOS versionné et vérifié en CI. **fait** : `apps/example-macos` contient un contrat dédié (`dev.intentlane.shelf`, cinq intentions `open_shelf`, `save_link`, `open_link`, `pin_link` et `delete_link`, une entité `link`, locales en/fr), la liste de protocoles attendue par le compilateur (`protocols.json`, la même que le `<Module>_const_extract_protocols.json` produit par Xcode) et `verify.mjs`, un script Node sans dépendance qui enchaîne génération, compilation et extraction sans projet Xcode. La recette est établie : `swiftc -target arm64-apple-macos<version>` avec **les deux** flags `-emit-const-values` et `-const-gather-protocols-list <json>` (sans le second, aucun `.swiftconstvalues` n'est écrit et le processeur refuse de tourner), puis `appintentsmetadataprocessor` avec `--platform-family macOS`, `--source-file-list` et `--swift-const-vals-list`. Prouvé par un run complet : les cinq actions, `outputFlags: 7` sur les quatre `open_app` et `4` sur la native `PinLink`, `DeleteLink` seule avec `authenticationPolicy: 1` et `isAuthPolExplicit: true`, `PinLink` dont l'`outputType` vaut `IntentLaneLinkEntity`, `IntentLaneLinkEntity`, `IntentLaneLinkQuery`, `IntentLaneSaveLinkTag` et quatre raccourcis. Le même fichier Swift, sans une ligne modifiée, produit donc des métadonnées App Intents complètes sur macOS comme sur iOS.
- Conformances de schéma (`@AppIntent(schema:)`, `@AppEntity(schema:)`). **fait** : une intention et une entité acceptent un champ optionnel `schema`, de la forme `domaine.membre`. La table (`packages/core/src/app-schemas.ts`) est dérivée de la surface publique des App Schemas d'Xcode 27 (27A266a) et croisée avec la table du processeur de métadonnées ; elle ne retient que les schémas que la forme générée peut satisfaire, soit trois intentions (`audio.createStation`, `camera.stopCapture`, `camera.switchDevice`) et vingt entités (`audio.ambientSound`, `notes.account`, `spreadsheet.document`, `wordProcessor.template`, et d'autres), plus les 254 références publiques connues, ce qui permet de distinguer une faute de frappe d'un schéma connu mais non conforme-able. Le générateur écrit `@AppIntent(schema: .<référence>)` et `@AppEntity(schema: .<référence>)`, émet `var` au lieu de `let` et omet `typeDisplayRepresentation` sur une entité conforme, parce que la macro applique un property wrapper et prend le nom d'affichage du schéma. Un schéma inconnu, mal formé, d'un autre genre, non satisfiable, ou dont la disponibilité iOS dépasse le `min_ios` de l'application, est refusé en IL1401 avec un message qui nomme ce qui manque. Les conformances d'enum restent à faire. Prouvé par un second contrat d'exemple (`apps/example-macos/schemas.yaml`, app Studio) et par `verify.mjs`, qui exécute désormais deux passes : pour l'action `StopCapture` conformée à `camera.stopCapture`, `outputFlags: 7` et `assistantDefinedSchemas` valant `[{"domain":"camera","name":"StopCaptureIntent","version":"1.0.0"}]` avec le protocole système `com.apple.link.systemProtocol.AssistantIntent` ; pour l'entité `IntentLaneSoundEntity` conformée à `audio.ambientSound`, `assistantDefinedSchemas` valant `[{"domain":"audio","name":"AmbientSoundEntity","version":"1.0.0"}]` ; et la passe Shelf, qui ne déclare aucun schéma, garde `systemProtocols` vide sur ses cinq actions. La mesure faite avant de s'y attaquer avait montré que les schémas utiles (`notes.createNote`, `calendar.createEvent`, `reminders.createReminder`, `mail.createDraft`) exigent que l'application fasse l'action et retourne l'entité créée, ce qui a rendu le mode `native` préalable.
- Exécution `native`. **fait** : le contrat nomme un handler Swift (`execution.mode: native` + `execution.handler`) et peut exiger une valeur de retour (`result.returns`, qui nomme une entité du contrat). Le générateur émet un `protocol <Handler> { func perform(...) async throws [-> IntentLane<Entité>Entity] }` par intention, le registre `@MainActor enum IntentLaneIntentHandlers { static var <id>: (any <Handler>)? }`, et un `perform()` qui jette `IntentLaneHandlerError.missingHandler("<id>")` tant que l'application n'a pas enregistré son implémentation ; avec `returns`, le type de retour porte `ReturnsValue<IntentLane<Entité>Entity>` et `.result(value:dialog:)` transporte la valeur. Diagnostics : handler absent, mal formé ou dupliqué, `route`/`mapping` sur une intention native, `result.returns` hors `native` ou vers une entité inconnue (IL1301, IL1601) ; `http` refusé (IL1401). Prouvé par un probe compilé et extrait sans Xcode (`extract.actionsdata` : `ArchiveNote` et `CreateNote`, `outputFlags: 4`), et par `apps/example-macos` dont l'intention native `pin_link` rapporte `outputFlags: 4` et un `outputType` valant `IntentLaneLinkEntity` alors que les quatre intentions `open_app` gardent `outputFlags: 7`. La mesure des `outputFlags` est désormais connue : `ProvidesDialog` 4, `ShowsSnippetView` 2, `OpensIntent` 1.

## Phase 4 — bêta open source (semaines 5–6)

- Documentation publique. **partiel** : le dépôt est public et sous licence MIT, avec `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` et `AGENT-GUIDE.md` dans le dépôt. Il n'y a pas encore de site de documentation ni de référence CLI publiée.
- CLI publiée sur npm. **paquet prêt, publication à faire** : `@intentlane/cli` n'est plus privé, son `bin` pointe sur `dist/index.cjs` (un seul fichier produit par esbuild, 558 ko, qui absorbe `commander`, `yaml` et `zod`, donc aucune dépendance runtime pour le consommateur), et `files` limite la publication au dossier `dist`. Prouvé par `npm pack` puis `npm install` du tarball dans un dossier vierge : `npx intentlane init` puis `npx intentlane validate` répondent `Valid IntentLane 0.1: 2 intent(s) ready.` avec deux paquets installés au total. Il reste à publier sur le registre, ce qui est impossible depuis cette machine faute d'identifiants npm (`npm whoami` répond 401 Unauthorized).
- Plugin `@intentlane/expo`. **paquet prêt, publication à faire** : plus privé, `files` limité à `app.plugin.cjs` et `src/apply.cjs`, `engines` node 22 ou plus. Il n'invoque plus `tsx src/index.ts` mais le bundle du CLI (`node <cli>/dist/index.cjs`), avec un message actionnable quand le paquet est installé mais que le bundle manque. Prouvé par `npm pack` (le tarball ne contient plus ni test ni déclaration de types) et par le job CI `simulator`, qui construit désormais le bundle avec `pnpm bundle` avant le prebuild.
- Diagnostics stables. **fait** : la liste des codes vit dans `DIAGNOSTIC_CODES`, exporté par `@intentlane/core`, `DiagnosticCode` en dérive et un test la verrouille, donc ajouter un code impose de mettre à jour la table de `SPEC.md`. `IL1701`, jusqu'ici documenté et jamais émis, est maintenant produit par `intentlane generate --check` quand un fichier généré ne correspond plus au hash enregistré dans le manifeste, avec un message distinct quand le contrat a simplement changé.
- Guide de migration. **fait** : `MIGRATION.md` à la racine couvre la politique de versioning du champ `schema` (SemVer simplifié, une montée mineure reste lisible par la même version majeure, une montée majeure est cassante et livre un chemin de migration), ce que signifie `0.1` (seule version, rien à migrer), ce qui se passera à la prochaine version, et le fait que `intentlane migrate` est prévu et pas encore livré. Les références trompeuses ont été corrigées : `SPEC.md` ne présente plus la commande comme disponible, et le hint du check `schema` de `intentlane doctor` pointait vers une commande inexistante.
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

Ticket suivant : `docs(oss): collect pilot feedback`.

