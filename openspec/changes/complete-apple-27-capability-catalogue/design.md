## Context

Le catalogue de `audit-catalogue.ts` porte 29 records répartis sur sept groupes
et un `claim` qui est déjà un gradient : `auditor` (détecter), `build`
(générer), `surfaces` (produire la surface), `siri-journey` (prouver un parcours),
`domain-package` (émettre le domaine complet).

Ce gradient répond déjà à la question « jusqu'où IntentLane va-t-il ». Il ne
faut donc pas introduire une deuxième échelle `catalogued / verified /
productized` : ce serait renommer une notion existante, casser `audit-format`,
`audit-diff`, la sortie JSON et les snapshots, pour un gain nul.

En revanche le gradient actuel est un scalaire unique, alors que « IntentLane
sait générer » et « une application l'utilise » sont deux faits indépendants.
Et rien dans `capability-audit/spec.md` ne décrit le second.

## Goals / Non-Goals

**Goals:** que le catalogue couvre la pile Foundation Models et les primitives
d'entités que le SDK 27 déclare, que chaque record porte la preuve qui
l'établit, que la dérive vers un SDK plus récent soit détectable, et que le
catalogue ne connaisse aucune application.

**Non-Goals:** générer du code pour une nouvelle primitive dans ce change. Ce
change décrit ce que l'auditeur sait voir ; générer une `EntityCollection` est
le change suivant. Ne pas renommer `CAPABILITY_CLAIMS`. Ne pas faire de `models`
un groupe optionnel : une pile absente du catalogue est un trou, pas une décision
de périmètre.

## Decisions

- **Les noms de symboles viennent du SDK, jamais de la prose.** Trois noms de la
  discussion initiale ne résistaient pas à la vérification et sont corrigés ici :
  `Private Cloud Compute` est `PrivateCloudComputeLanguageModel`, et non un
  symbole seul ; l'OCR est `OCRTool` dans `_Vision_FoundationModels` ;
  `SpotlightSearchTool` est dans `_CoreSpotlight_FoundationModels`. Les trois
  existent, sous ces noms-là et dans ces modules-là.

- **Un framework-pont est une information de premier plan.** Un symbole public
  dans un framework à underscore n'est pas résolvable depuis le seul module
  public. L'auditeur doit connaître le framework pour le détecter, donc le
  record le porte.

- **Le catalogue ne nomme aucune application.** La consommation et la priorité
  vivent dans un overlay séparé, joint au rapport. Le catalogue reste un fait
  Apple et reste valide quand l'overlay est absent. C'est ce qui permet à
  IntentLane de décrire une app sans la connaître.

- **La dérive est un manque de catalogue, pas un constat de projet.** Un symbole
  public présent dans le SDK et absent du catalogue se signale comme un manque
  de catalogue. Le confondre avec une capacité manquante de l'app auditée
  produirait un faux positif sur chaque projet tant que le catalogue n'est pas à
  jour.

- **`models` est un groupe à part entière, pas une extension de `foundation`.**
  Foundation Models n'est pas une brique des App Intents : c'est la pile de
  raisonnement, elle a son cycle, son framework et son mode d'échec.

## Risks / Trade-offs

- Le SDK évolue plus vite que le change : le test de dérive échoue et nomme le
  symbole, ce qui est le comportement voulu d'un test.
- Ajouter un groupe casse l'assertion de tableau exact dans
  `audit-catalogue.test.ts` : c'est un test qui fait son travail, il se met à
  jour avec l'intention, pas autour d'elle.
- Un overlay peut mentir sur une capacité que le catalogue ne connaît pas
  encore : l'overlay ne crée pas d'entrée de catalogue, il ne fait qu'annoter.
- Le catalogue s'allonge et l'overlay devient un registre de projets : l'overlay
  reste une liste d'ids de capacités, et aucun nom de repository n'apparaît
  dans le code.
