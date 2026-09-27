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

## Pourquoi IINA est le pilote de l'observation, et un seul

La tâche 5.1 demande de choisir le pilote dont l'observation a une valeur
commerciale, et le groupe entier s'appelle « au plus une fois ». IINA est ce
pilote, pour trois raisons mesurées plutôt que preferences.

**C'est le seul pilote dont la surface observée est déjà le cœur du produit.**
Un client d'un client de transfert de fichiers ne se demande pas « Siri ouvre ma
connexion », il ne l'a jamais demandé. Un lecteur vidéo, si : « ouvre ce que je
regardais », c'est une phrase que tout le monde a déjà dite à un Mac. La valeur
commerciale d'une observation est la probabilité qu'un client s'en serve dans une
conversation de vente, et cette probabilité n'est pas la même dans les six
domaines.

**C'est le seul pilote qui a déjà la mécanique complète en place**, donc le seul
où l'observation est un geste et non un projet. `evidence-ledger.yaml` décrit
déjà trois parcours, `contract` et `build` sont déjà `pass` sur chacun, les
fixtures sont un script de trois clips synthétiques, et l'obstacle principal de
l'observation, la **langue de Siri**, est une ligne `TODO` et non une
investigation. Les quatre autres pilotes n'ont ni ledger, ni fixtures, ni
parcours décrits.

**C'est le seul pilote où une observation négative serait encore un résultat.**
IINA est un lecteur vidéo : la surface est un index nommé et un handler
d'ouverture, les deux choses que les cinq pilotes certifient déjà par commande.
Si l'observation échoue, elle dira pourquoi, et la raison sera instructive pour
les quatre autres. Sur un pare-feu ou un client de transfert, un échec
d'observation dirait surtout qu'une personne a essayé.

Ce qui n'est **pas** une raison : IINA n'est ni le plus gros pilote ni celui
qui a le plus de checks. LuLu en a 113 et Cyberduck 118, IINA 65. La valeur
commerciale d'une observation ne se lit pas dans le nombre de tests.

## Pourquoi l'observation n'est pas faite ici

Trois raisons, toutes vérifiables, et aucune n'est « je n'ai pas eu le temps ».

**Le processus agent ne peut pas entrer dans la session Aqua.** La sonde de
lancement elle-même le constate et dit pourquoi : sans session graphique, un
lancement peut démarrer un processus, ce processus peut planter ou se suspendre
ou refuser silencieusement de s'enregistrer, et la sonde devrait alors deviner.
Les deux sondes du dépôt portent cette distinction dans leur propre sortie.

**Il faut une personne avec un écran, deux fois.** Le ledger exige une
reproduction par une seconde personne sans aide, et c'est la disposition
correcte : une observation qu'une seule personne a vue ne prouve pas qu'elle
fonctionne, elle prouve qu'elle a fonctionné une fois.

**Le ledger attend deux conditions que l'agent ne peut pas fournir**, et il les
dit lui-même :

```yaml
siriLanguage: TODO a confirmer avant l'observation
historyRecording: TODO a confirmer avant l'observation
reproduction:
  by: "none yet"
  status: blocked
```

Ce que la campagne a fait à la place, c'est **prouver que la porte se comporte
comme prévu quand l'observation manque**, et non pas la contourner :

```
pending  siri-conversation [observed]: pending
claims waiting on a person: siri-conversation
```

C'est le comportement voulu par la recette, et la commande sort non nul. Le dire
explicitement vaut mieux que de laisser croire que la porte n'a jamais été
exercée.

**Et les portes déterministes de ce pilote ne sont pas vertes sur cette machine**,
ce qui est important pour qui exécute le runbook : la copie de travail IINA est
sortie sur `intentlane/from-scratch` alors que les sources du pilote n'existent que
sur `intentlane/pilot-playedmedia`. Les quatre portes déterministes échouent donc
sur un fichier absent, et non sur une régression. Le README du pilote le dit, et
le runbook doit le dire avant que quelqu'un perde une heure à chercher un bug qui
n'existe pas.

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

