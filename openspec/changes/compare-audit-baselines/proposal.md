## Why

Le playbook de pilote demande une baseline JSON puis un delta après
l'implémentation. Aujourd'hui, cette comparaison est manuelle : elle est
fragile, ne peut pas protéger une régression en CI, et mélange facilement une
amélioration de capacité avec un changement de conditions de test.

## What Changes

- Ajoute `intentlane audit-diff <baseline.json> <candidate.json>`.
- Compare des rapports JSON produits par `intentlane audit`, sans relancer
  l'audit ni lire le dépôt audité.
- Produit un delta déterministe en texte ou JSON, et peut échouer en présence
  d'une régression de capacité.

## Non-goals

- Ne remplace pas la preuve humaine Siri, Shortcuts ou Spotlight.
- Ne compare pas les sorties texte ou SARIF.
- Ne déduit pas une causalité entre un changement de source et un delta.

## Impact

`@intentlane/core`, CLI, diagnostics `ILA`, tests de contrat, guide d'audit et
playbook pilote.

