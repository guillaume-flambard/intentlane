# IntentLane — Client Quickstart

Objectif : intégrer une capacité App Intents vérifiable dans une app cliente en
une session, puis la faire tourner dans sa CI. Durée estimée : 30 à 45 minutes
pour un développeur qui connaît son app (le parcours n'a jamais été mesuré
avec une personne externe).

## Prérequis

- macOS avec Xcode 27 (le toolchain extrait les métadonnées App Intents ;
  `verify.mjs` refuse un toolchain antérieur).
- Node 22+ (CLI et plugin), npm ou pnpm.
- Une app cliente : cible Swift/Xcode native, ou app Expo/React Native avec un
  dossier natif régénéré par `prebuild`.
- Aucun compte, aucun certificat : les App Intents se compilent et se testent
  en local ; le build simulateur suffit.

## Durée et étapes

| Étape | Durée | Produit |
| --- | --- | --- |
| 1. Audit | 5 min | rapport des capacités et des écarts, sans écrire |
| 2. Contrat | 5 min | `intentlane.yaml` (1–2 intents, 1 entité) |
| 3. Génération | 1 min | Swift + strings + manifeste + squelette d'adaptateur |
| 4. Code à remplir | 15–25 min | adaptateur (résolution, droits, routeur) + test métier |
| 5. Vérification locale | 5 min | `intentlane verify` |
| 6. CI | 5 min | une commande `intentlane verify --strict` |

## Fichiers à créer

```text
intentlane.yaml                  # contrat (source de vérité)
Mac/IntentLaneAdapter.swift      # généré une fois, puis application-owned
<output>/IntentLaneGenerated.swift
<output>/<locale>.lproj/IntentLane.strings
<output>/intentlane.manifest.json
Tests de l'app (votre target)    # test métier du contrat
.github/workflows/intentlane.yml # porte CI
```

## Commandes locales

```sh
npx @memolabs-apps/intentlane init                          # contrat minimal, ne touche à rien d'autre
npx @memolabs-apps/intentlane validate                      # YAML valide (diagnostics IL)
npx @memolabs-apps/intentlane generate -c intentlane.yaml \
  -o Mac/IntentLaneGenerated \
  --adapter-output Mac/IntentLaneAdapter.swift   # Swift + squelette d'adaptateur
npx @memolabs-apps/intentlane doctor                        # environnement
npx @memolabs-apps/intentlane verify \
  -c intentlane.yaml \
  -o Mac/IntentLaneGenerated \
  --app-test "xcodebuild -project Client.xcodeproj -scheme Client -destination 'platform=macOS' test" \
  --metadata build/.../Client.app/Metadata.appintents
```

`--adapter-output` n'écrit un squelette que si le contrat déclare un intent de
schéma système (`system.open`) visant une entité, ou un handler de recherche.
Sur le contrat minimal produit par `init`, qui n'en déclare aucun, la génération
refuse d'inventer un adapter et s'arrête; la commande réussit une fois l'étape 2
faite.

Pour une app Expo : `npx expo prebuild`, puis le plugin `@intentlane/expo` relance
la génération à chaque prebuild ; `apps/example-expo` est la référence complète.

## Le seul code à remplir

IntentLane émet l'interface ; l'app fournit le reste, jamais l'inverse :

1. **Résolution** : implémenter le protocole de l'entité (ex.
   `IntentLaneIdeaResolver`) — `entities(for:)`, `suggestedEntities()` — et
   l'enregistrer (`IntentLaneEntityResolvers.idea = MonResolver()`).
2. **Droits** : ne renvoyer que les objets autorisés ; un titre absent → zéro
   résultat ; un objet non autorisé n'est ni suggéré ni ouvert.
3. **Routeur** : ouvrir via la navigation existante de l'app (sidebar, deep
   link, écran), sélectionner l'ID exact.
4. **Test métier** : prouver les sept points du contrat (ID stable exact,
   recherche autorisée ordonnée, zéro résultat sur titre absent, objet non
   autorisé exclu, ouverture via le routeur réel, écriture avec droits +
   confirmation + effet final, réindexation sur create/update/delete).

L'adaptateur généré contient des TODOs pour ces quatre points. Une génération
suivante refuse de l'écraser sans `--overwrite-adapter`.

## Commande CI unique

```yaml
# .github/workflows/intentlane.yml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 22
  - run: npx @memolabs-apps/intentlane verify --pilot intentlane.pilot.yaml --strict
```

Le manifeste `intentlane.pilot.yaml` déclare ce que le client revendique et la
commande qui settles chaque porte :

```yaml
version: intentlane-pilot/1.0
contract: intentlane.yaml
generated: Mac/IntentLaneGenerated
metadata: build/.../Client.app/Metadata.appintents
claims: [contract, generated, applicationTests, integrationTests, metadata]
gates:
  applicationTests: "xcodebuild -project Client.xcodeproj -scheme Client test"
  integrationTests: "bash tests/run-integration-tests.sh"
```

`verify` affiche chaque revendication avec sa famille et son statut, puis écrit
`Any claim not listed here is not certified`. `--strict` sort non nul tant qu'une
revendication de l'ensemble n'est pas certifiée. Le ledger n'est lu que si une
revendication observée, comme `siri-conversation`, est effectivement revendiquée.
`npx @memolabs-apps/intentlane claims` affiche le catalogue complet.

## Test automatique ≠ preuve visuelle Siri/Spotlight

| | Automatisé | Preuve visuelle |
| --- | --- | --- |
| Contrat / génération / build / métadonnées | oui | non |
| Tests métier (résolution, droits, navigation) | oui | non |
| Intégration réelle (résolveur, ouverture, routage) | oui | non |
| Carte Siri / Spotlight visible | non | **oui**, observation réelle |
| Conversation Siri parlée | non | **oui**, phrase réelle |
| Reproduction indépendante | non | **oui**, second testeur |

Une certification verte prouve la chaîne du client, pas Siri. Le statut
`certified` nomme les revendications qu'il couvre, et rien d'autre n'est
certifié. Ne jamais promettre une phrase Siri ni une carte Spotlight sans
l'observation réelle consignée dans le ledger, en revendiquant explicitement la
revendication observée correspondante.


## Procédure de validation par deux testeurs

1. Installer le build vérifié (simulateur ou appareil de test).
2. Testereur A exécute chaque parcours (recherche Spotlight, ouverture,
   action écrite, négatif) et consigne : date, OS + build, locale, langue Siri,
   phrase, résultat attendu, résultat observé.
3. Testeur B rejoue les mêmes parcours depuis un état propre, sans assistance.
4. Le ledger (`PILOT-CLIENT-LEDGER.yaml`) ne passe à `verified` qu'avec les
   deux observations concordantes. `intentlane evidence validate --strict`
   le vérifie.
5. Aucune revendication commerciale ne dépasse le statut du ledger.