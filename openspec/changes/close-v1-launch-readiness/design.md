## Context

La promesse v1 est volontairement étroite : un audit local des capacités, une
génération déterministe d'App Intents, et un parcours Siri vérifié sur macOS
27 puis iOS 27. Les API Apple 27 enrichissent ensuite trois familles :
recherche et découverte, collaboration inter-apps, et exécution. Elles sont
des packages distincts, déclenchés par une demande pilote écrite.

Apple indique que `IndexedEntity` est la voie principale pour la résolution
sémantique, qu'`EntityStringQuery` convient aux contenus non indexables, et
que les App Schemas rendent les actions compréhensibles par Siri. Les sessions
WWDC26 confirment que la preuve doit progresser de l'isolé AppIntentsTesting à
Shortcuts, Spotlight puis Siri. Sources :

- https://developer.apple.com/videos/play/wwdc2026/240/
- https://developer.apple.com/videos/play/wwdc2026/343/
- https://developer.apple.com/videos/play/wwdc2026/345/
- https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes
- https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes

## Launch boundary

| Classe | Incluse dans la sortie v1 | Règle |
| --- | --- | --- |
| Fondations | Oui | Contrat, générateur, plugin, audit et CI doivent être verts. |
| Schémas App Intents | Oui, un domaine prouvé | Ne promettre que le domaine et les parcours observés. |
| Preuve système | Oui | Ledger valide, Siri manuel, reproduction indépendante. |
| Diff d'audit | Oui | Reproductible et utilisable comme barrière CI. |
| Publication | Oui | Tarballs, installation neuve et quickstart externe vérifiés. |
| IndexedEntity complet, recherche distante | Non sauf demande pilote | Package `A1`, avec confidentialité et cycle de vie. |
| Transfer, contexte écran, donations, pertinence | Non sauf demande pilote | Packages indépendants, jamais un flag générique. |
| Collections, valeurs riches, exécution longue, targets | Non sauf demande pilote | Packages indépendants et matrice plateforme. |

## State model

Un item de lancement est `code-ready`, `human-gate`, `owner-decision`,
`blocked` ou `closed`. Une case ne passe à `closed` que lorsque son artefact
est lié et son critère de fermeture est rempli. `blocked` décrit un fait
externe, pas une approximation de progrès.

Les quatre états empêchent les faux positifs :

1. Le code et les tests prouvent la forme et le comportement isolé.
2. Les métadonnées prouvent l'enregistrement dans le binaire.
3. Les surfaces système prouvent Shortcuts ou Spotlight si elles sont
   revendiquées.
4. Le test Siri manuel et une seconde personne autorisent un claim public.

## Apple 27 revalidation

Avant toute release, le catalogue est vérifié contre le SDK Xcode réellement
utilisé, les symboles et disponibilités par cible, puis les notes de version
macOS 27 et iOS 27. Toute différence crée soit une correction de catalogue,
soit une capacité explicitement `unknown`, jamais une supposition.

Les régressions connues, notamment l'ambiguïté entre plusieurs `OpenIntent`
sur macOS 27 et les changements de formes de paramètres dans les notes iOS,
deviennent des fixtures négatives ou des limitations documentées lorsque le
pilote touche la surface concernée.

## Sequencing

1. Réconcilier les documents existants et fermer les deux outils de preuve.
2. Revalider le catalogue Apple 27 et corriger les incohérences de docs.
3. Fermer le pilote macOS et sa reproduction, puis le pilote iOS.
4. Réaliser le quickstart externe et préparer/publier les paquets selon la
   décision npm du propriétaire.
5. Former la cohorte, publier uniquement les claims soutenus et lancer la
   landing après revue.

Le travail d'open core et les packages avancés ne retardent pas cette séquence
sauf s'ils deviennent une promesse publique de la v1.

