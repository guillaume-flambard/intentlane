# ADR de conception: les couches sont optionnelles depuis le début, donc aucune version

## Le trou que cette change bouche

Un ledger de preuves ne pouvait nommer que cinq couches, `contract`, `build`,
`shortcuts`, `spotlight` et `siri`. Il ne pouvait donc pas distinguer « la preuve
manque » de « la preuve est là mais vient d'une couche qu'on ne sait pas nommer »,
ni exiger d'une revendication qu'elle soit démontrée par une couche identifiée.

Et rien ne disait, pour une revendication, ce qui la prouve. C'était implicite, donc
non vérifiable, donc c'était exactement l'inférence que la change
`carry-access-to-the-contract` avait déjà supprimée ailleurs.

## Deux décisions, et pourquoi

**Aucun bump de version.** `checkLayers` faisait déjà `if (status === undefined)
continue` : les couches sont optionnelles depuis l'origine. Le format n'a pas changé
de forme, seulement de vocabulaire. `pilots/iina/evidence-ledger.yaml` reste donc
valide tel quel, et produit exactement les mêmes six diagnostics qu'avant. Un ancien
binaire lisant un nouveau ledger dit `Unknown evidence layer 'runtime'`, ce qui est un
échec franc et non une corruption silencieuse, donc c'est le bon sens de la rupture.

**Les nouvelles couches sont revendiquables.** `metadata`, `runtime`, `query` et
`annotations` entrent dans `PILOT_LEDGER_CLAIMABLE_LAYERS`. Sinon, dès qu'une
revendication exigerait `runtime`, la règle qui vérifie les exigences tirerait la
faute sur chaque journey, puisque personne ne pourrait le revendiquer. `contract` et
`build` restent hors de cet ensemble parce qu'un journey les tient toujours.

## Ce que cette change ne fait pas

Elle ne lie pas encore un journey à ses revendications. Aucun diagnostic ne compare
`claims` aux `requires`, et rien ne déduit une revendication depuis un statut de
couche. C'est la change suivante, et elle a ses propres tests, parce que déduire
`spotlight: pass` en « la revendication Spotlight est vérifiée » serait exactement
l'inférence implicite qu'on élimine.

Elle n'ajoute aucun verdict. `claim-confidence` reste seul responsable, et aucun
chemin layer-to-claim n'est introduit ici.

## Limite assumée

Les `requires` posés sur les neuf revendications sont un jugement, pas une
déduction. Ils disent ce qui prouve une revendication, pas ce qui la constate
aujourd'hui. Une revendication dont la preuve n'a pas encore de couche, par exemple
le harnais `AppIntentsTesting`, ne peut pas encore être déclarée, donc la couche
`runtime` est désormais nommée mais non requise par personne. Cet état est
volontaire : la couche existe dans le vocabulaire avant d'avoir une revendication qui
la réclame.
