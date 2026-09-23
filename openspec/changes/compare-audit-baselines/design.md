## Context

Les sorties JSON actuelles contiennent un rapport unique ou une collection
`reports` quand `--platform both` est utilisé. Les findings sont déjà triés par
capacité et plateforme, mais les champs annexes, notamment SDK, route, données,
architecture, conditions, qualité et catalogue, ont un sens distinct du score.

## Decisions

- Le module profond `audit-diff` expose une interface unique : il reçoit deux
  documents JSON validés et retourne un `AuditDelta`. La lecture de fichier et
  l'affichage restent dans le CLI.
- La clé de jointure est `(target.platform, capability)`. Les noms de cible ne
  sont pas une clé, afin de comparer un fork à son upstream.
- Un changement d'état suit l'ordre public de `AuditState`. Une baisse est une
  régression, une hausse une progression, et l'ajout ou la disparition d'une
  capacité est un changement à examiner, jamais une progression inférée.
- Les conditions, SDK, catalogue et cible sont rapportés comme contexte changé,
  sans classement positif ou négatif. Un score changé est dérivé des rapports,
  jamais comparé comme preuve primaire.
- Le CLI reste read-only. `--output` est le seul effet d'écriture explicite.

## Risks / Trade-offs

- Le format `1.0` peut évoluer. Le parseur refuse toute version inconnue au
  lieu de comparer silencieusement des surfaces incompatibles.
- Une absence de finding peut provenir d'un catalogue différent. Elle doit être
  visible comme changement plutôt que masquée par le score.

