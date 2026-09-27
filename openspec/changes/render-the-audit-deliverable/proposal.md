# M3: The audit deliverable

## Why

L'audit produit un rapport JSON complet et personne ne le lit. Ce qu'un client
reçoit aujourd'hui est `formatText`: une liste à plat
`platform state capability (confidence)`, sans ordre de lecture, sans frontière de
preuve, et sans séparation entre ce que la machine a constaté et ce qu'un humain
doit encore vérifier. L'offre vendue est un audit à périmètre fixe dont le
livrable est le document que le client ouvre, et le jalon du 2026-10-10 est une
offre partie: il n'existe aujourd'hui aucun document à envoyer.

## What Changes

- Nouvelle capacité `audit-deliverable`: un rendu Markdown déterministe du
  rapport d'audit, en fonction pure du JSON déjà écrit.
- Nouvelle commande `intentlane deliverable <rapport.json> [--out <fichier>]`
  qui lit un rapport existant et rend le livrable. Elle ne ré-audite rien, elle
  ne lit pas le dépôt audité, et elle n'écrit que le fichier de sortie.
- Le livrable sépare les faits machine des observations humaines, et ne présente
  jamais une observation humaine comme une preuve automatisée, ni l'inverse.
- Chaque nombre du livrable est copié du rapport. Aucun nombre n'est recalculé,
  et aucune métrique que le rapport ne porte n'apparaît.
- L'absence reste `unknown`: une capacité que l'audit n'a pas décidée est
  rendue comme indécise, jamais comme résolue dans un sens ou dans l'autre.
- La frontière de plateforme est explicite: macOS et iOS sont rendus séparément,
  et un schéma App Shortcuts seul n'est jamais rendu comme Siri ou Apple
  Intelligence.
- La frontière de revendication voyage avec le document: ce que l'audit affirme,
  ce qu'il refuse, et ce qu'un humain doit encore vérifier.
- L'application macOS affiche ce livrable caractère pour caractère tel que le
  moteur l'a rendu, et permet de l'enregistrer ou de le copier. Elle ne le rend
  pas: la fenêtre ne recompose jamais un artefact du moteur, elle le lit.

## Capabilities

### New Capabilities

- `audit-deliverable`: Le document que le client lit, rendu depuis le rapport
  d'audit sans le recalculer et sans le réauditer.

### Modified Capabilities

- Aucun. `capability-audit` reste la spécification du rapport machine; le
  livrable le lit, il ne le redefine pas. Aucun format existant ne change.

## Impact

`packages/core` gagne un module de rendu pur et ses tests. `packages/cli` gagne
une commande. `apps/studio` gagne un écran qui affiche et exporte le livrable,
plus le lecteur qui l'obtient du moteur. Le rapport d'audit reste la seule
autorité. Aucune dépendance nouvelle, aucun accès réseau, aucun appel de
modèle. Le rapport réel FSNotes, déjà commité, sert de preuve: 51 findings, un
score, dix groupes.

**Écart de langue, noté volontairement.** `openspec/config.yaml` demande des
artifacts en français, mais les douze specs déjà synchronisées sont en anglais et
le contrat se lit en anglais. La prose de ce change (cette page, le design, les
tâches) est donc en français, et les requirements sont en anglais comme les
douze autres, pour ne pas introduire une treizième langue dans le contrat.
Si la décision est l'inverse, un seul passage à relire: les requirements.

## Non-Goals

- Aucune métrique que le rapport ne produit pas. Pas de « 87% de chances que ça
  marche », pas de pourcentage de couverture sémantique, pas de score
  repondéré.
- Aucun appel de modèle, aucune rédaction. Le rendu est une fonction du JSON.
- Aucun inventaire de capacités nouveau: le livrable réorganise le rapport, il
  ne le recalcule pas et n'ajoute aucune capacité que le rapport ne nomme pas.
- Pas de preuve humaine ajoutée au document. Le livrable ouvre la place où un
  humain notera son observation, il ne la remplit pas.
- La fenêtre ne rend pas le livrable. Elle affiche le texte que le moteur a
  produit, et un test compare ce qu'elle affiche au fichier que la commande a
  écrit: deux rendus du même document ne peuvent pas diverger.
- Pas de nouvelle question au moteur. Le livrable lit un rapport déjà écrit.
