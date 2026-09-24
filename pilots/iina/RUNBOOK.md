# IntentLane IINA pilot — live evidence runbook

Ce runbook décrit la seule partie du pilote qu'aucune porte automatisée ne peut
couvrir : ce que le système montre vraiment à une personne. Les quatre portes
automatisées passent, le code est enregistré au lancement et l'index nommé est
réconcilié, mais tant que personne n'a observé Spotlight et Siri, le pilote reste
un feedback et non une revendication. Le ledger `evidence-ledger.yaml` le dit
explicitement, et `intentlane verify --ledger` refuse de le lire comme vérifié.

## Ce que le pilote revendique

Deux surfaces, et rien d'autre :

- `system.searchInApp` : une recherche de média joué arrive dans la fenêtre
  d'historique d'IINA, filtrée sur le terme demandé.
- `system.open` : Siri ouvre un média joué précis, après avoir demandé lequel
  quand deux médias portent le même titre visible.

Aucun App Shortcut n'est enregistré. Aucun chemin de fichier n'apparaît dans un
identifiant, un titre ou un sous-titre. Rien n'est indexé quand l'enregistrement
d'historique est désactivé.

## Avant de commencer

1. Rejouer les portes automatiques, qui doivent rester vertes :

   ```sh
   cd ~/projects/active/apps/clients/intentlane
   pnpm exec tsx packages/cli/src/index.ts verify \
     -c pilots/iina/contract.yaml -o pilots/iina/out \
     --metadata pilots/iina/out/metadata/Metadata.appintents \
     --app-test "bash pilots/iina/tests/run-all-tests.sh" \
     --ledger pilots/iina/evidence-ledger.yaml
   ```

2. Préparer les fixtures :

   ```sh
   bash pilots/iina/fixtures/prepare-fixtures.sh
   ```

   Trois clips synthétiques de trois secondes. `fixture-03.mp4` porte le titre
   `Cygnus` alors que son nom de fichier ne contient pas ce mot : c'est
   volontaire, pour que la campagne observe la divergence entre le titre que Siri
   résout et le chemin que la fenêtre d'historique recherche.

3. Installer l'app du pilote, puis la lancer une fois, jouer chaque fixture une
   fois, et quitter IINA proprement. L'historique contient alors les trois médias.
   Vérifier que le log de lancement contient bien :

   ```
   IntentLane: PlayedMedia registered, resolver true, open true, search true
   IntentLane: indexed 3 item(s)
   ```

   Si ces deux lignes ne sont pas là, la campagne ne commence pas : les portes
   automatisées ne le diraient pas.

4. Noter les conditions de l'observation, telles qu'elles doivent figurer dans le
   ledger : version d'OS et son build, build de Xcode, modèle de machine, locale,
   langue de Siri, version de l'app, et index utilisé.

## Parcours à observer

Chaque observation note le résultat tel quel. Un échec reste un échec.

### 1. Trouver un média joué

- Rechercher dans Spotlight le titre visible d'un fixture, par exemple `Aurora`.
- Noter si un résultat attributed à IINA apparaît, et s'il ouvre exactement ce
  média.
- Refaire avec `Cygnus` : noter ce que donne le chemin, dont le nom ne contient
  pas le titre. C'est le cas qui distingue une résolution Siri d'une recherche
  dans la fenêtre.

### 2. Ouvrir un média joué

- Demander à Siri d'ouvrir un média joué, par exemple « ouvre Aurora dans IINA ».
- Noter le résultat, et surtout ce qu'il se passe quand deux médias portent le
  même titre visible : Siri doit demander lequel, et le média choisi doit être
  celui qui s'ouvre.
- Répéter avec le titre `Cygnus` pour le cas titre différent du nom de fichier.

### 3. Refuser un média inconnu

- Donner à Siri un titre qui n'existe pas, par exemple `Phénix`.
- Noter que rien ne s'ouvre et qu'aucun média voisin n'est sélectionné à la
  place. Un substitut serait un défaut, pas un succès.

### 4. Média supprimé

- Supprimer le fichier d'un fixture.
- Noter qu'il n'est plus proposé, dans Spotlight comme dans Siri, et qu'une
  tentative d'ouverture échoue sans rien ouvrir à la place.
- C'est aussi le moment pour observer ce que dit l'identifiant : IINA dérive son
  identifiant du chemin, donc un déplacement ou un renommage change
  l'identifiant. L'ancien identifiant ne résout rien, ce qui est le
  comportement voulu et testé, mais cela doit être observé et non supposé.

## Remplir le ledger

Une fois les observations faites :

1. Remplacer chaque `blocked` par le `pass` ou le `fail` observé, sans en
   amenuiser la formulation.
2. Renseigner les conditions réelles de l'observation, et retirer les `TODO`.
3. Faire reproduire les parcours acceptés par une seconde personne, sans aide, à
   partir d'un état propre, puis remplacer le bloc `reproduction` par son nom et
   `status: pass`.
4. Valider :

   ```sh
   pnpm exec tsx packages/cli/src/index.ts evidence validate \
     pilots/iina/evidence-ledger.yaml --strict
   ```

   Le code de sortie doit être `0` et le statut `verified`. Tant qu'il ne l'est
   pas, le pilote reste un feedback : aucune revendication publique, aucune
   étude de cas, et le statut du pilote dans la documentation reste
   `awaiting-live-evidence`.

## Ce que cette campagne ne peut pas établir

- Aucun automatisation ne pilote l'interface de Siri. Si une observation n'a pas
  été faite par une personne, elle n'existe pas.
- Une observation réussie ne vaut que pour les conditions notées. Un build
  d'OS, une locale ou une version d'app différents imposent de recommencer.
- Le second testeur doit reproduire les parcours acceptés sans assistance. S'il
  ne peut pas, le ledger reste `unverified` même si le premier passage a réussi.
