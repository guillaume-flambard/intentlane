# IntentLane IINA pilot — live evidence runbook

Ce runbook ne décrit plus une porte de livraison. Le pilote est **certifié pour ce
qu'une commande peut prouver**, sans aucune intervention humaine :

```
pass  contract [deterministic]: verified
pass  generated [deterministic]: verified
pass  applicationTests [deterministic]: verified
pass  integrationTests [deterministic]: verified
pass  metadata [deterministic]: verified
pass  indexSync [deterministic]: verified
certified: Certified for the declared claims only: ...
```

Ce qui reste non prouvable, la conversation Siri et l'affichage du résultat
Spotlight, n'est pas une revendication du pilote. C'est une **revendication
observée**, disponible sur demande, et c'est tout ce que ce document décrit.

Si tu veux pouvoir dire que Siri ouvre un média joué précis, tu revendiques
explicitement l'observation, et elle a besoin de quelqu'un :

```sh
intentlane verify --pilot pilots/iina/pilot.yaml --claim siri-conversation --strict
```

Cette commande sort non nul tant que l'observation n'est pas au ledger. Elle ne
retire rien à la certification ci-dessus : elle ajoute une ligne
`pending siri-conversation [observed]` et n'obtient `certified` que si le ledger
décrit une reproduction indépendante.

## Ce que le pilote revendique, et ce qu'il ne revendique pas

Il revendique `contract`, `generated`, `applicationTests`, `integrationTests`,
`metadata` et `indexSync`. Il ne revendique ni `siri-conversation` ni
`spotlight-ui-result`.

Deux surfaces existent, et rien d'autre n'est enregistré :

- `system.searchInApp` : une recherche de média joué arrive dans la fenêtre
  d'historique d'IINA, filtrée sur le terme demandé. Le routage est certifié par
  le harnais d'intégration.
- `system.open` : ouvrir un média joué précis. La décision d'ouverture, y compris
  le refus d'un identifiant inconnu et l'absence de substitution, est certifiée
  par le harnais d'intégration.

Aucun App Shortcut n'est enregistré. Aucun chemin de fichier n'apparaît dans un
identifiant, un titre ou un sous-titre. Rien n'est indexé quand l'enregistrement
d'historique est désactivé.

## Ce que la campagne ne peut pas établir, et pourquoi

Aucune API publique n'envoie une phrase à Siri, et Core Spotlight n'offre aucune
lecture d'un index nommé. Ces deux faits ne sont pas un manque d'effort : ils
planchent la revendication. C'est pour cela que le pilote est certifié sans
campagne, et que la phrase « Siri marche » reste à ne pas dire.

## Si l'observation est demandée

1. Rejouer les portes, qui doivent rester vertes :

   ```sh
   cd ~/projects/products/intentlane
   pnpm exec tsx packages/cli/src/index.ts verify --pilot pilots/iina/pilot.yaml --strict
   ```

2. Préparer les fixtures :

   ```sh
   bash pilots/iina/fixtures/prepare-fixtures.sh
   ```

   Trois clips synthétiques de trois secondes. `fixture-03.mp4` porte le titre
   `Cygnus` alors que son nom de fichier ne contient pas ce mot : c'est
   volontaire, pour que l'observation distingue une résolution Siri d'une
   recherche dans la fenêtre.

3. Lancer l'app du pilote, jouer chaque fixture une fois, quitter IINA
   proprement, et vérifier que le log contient :

   ```
   IntentLane: PlayedMedia registered, resolver true, open true, search true
   IntentLane: indexed 3 item(s)
   ```

4. Observer les parcours : titre exact dans Spotlight, homonyme dans Siri, titre
   `Cygnus` dont le titre diffère du nom de fichier, titre inventé qui n'ouvre
   rien et ne sélectionne aucun voisin, fichier supprimé qui n'est plus proposé.

5. Noter les conditions réelles dans `evidence-ledger.yaml` : version d'OS et son
   build, build de Xcode, modèle, locale, langue de Siri, version de l'app, index.

6. Faire reproduire les parcours acceptés par une seconde personne, sans aide,
   puis remplacer le bloc `reproduction`.

7. Valider :

   ```sh
   pnpm exec tsx packages/cli/src/index.ts evidence validate \
     pilots/iina/evidence-ledger.yaml --strict
   ```

Tant que le code de sortie n'est pas `0`, l'observation n'est pas établie et la
revendication reste `pending`. C'est le comportement voulu, pas un blocage du
produit.

