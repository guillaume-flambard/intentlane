## Context

Le playbook définit cinq couches de preuve et les statuts `pass`, `fail`,
`not-applicable` et `blocked`. Aujourd'hui ces informations sont dans des
documents Markdown, sans règle mécanisable qui borne ce qui peut être déclaré.

## Decisions

- Le module profond `pilot-ledger` reçoit un ledger déjà parsé et retourne un
  résultat de validation, des diagnostics et un résumé publiable. Son interface
  n'accepte ni chemin de dépôt, ni exécuteur système.
- Le ledger est YAML, pour rester cohérent avec le contrat IntentLane. Il porte
  une version, une cible, une révision, des conditions, au plus trois parcours,
  et le résultat de reproduction par une seconde personne.
- Un parcours déclare les surfaces revendiquées. `contract` et `build` sont
  toujours requis ; `shortcuts`, `spotlight` et `siri` ne le sont que lorsqu'ils
  sont revendiqués. Une action à risque exige aussi confirmation,
  authentification et ownership documentés.
- Un ledger est `verified` seulement si chaque couche requise est `pass` pour
  chaque parcours et si une reproduction indépendante est `pass`. Tout autre
  état est `unverified` et ne débloque aucune revendication publique.
- Les chemins d'artefacts sont des références relatives au ledger et ne sont
  pas lus. Cela conserve la validation déterministe et empêche d'interpréter
  une capture comme une preuve.

## Risks / Trade-offs

- Une saisie humaine peut mentir. Le format rend l'assertion explicite et
  traçable, il ne certifie pas l'observation.
- Les conditions Apple changent. Elles sont enregistrées, jamais inférées à
  partir de la machine exécutant le validateur.

