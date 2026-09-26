## Why

L'auditor sait nommer des capacites, les diagnostics savent nommer des echecs, les
revendications savent dire ce qui les prouve, et rien ne repond a « qu'est-ce que cela
veut dire, qu'ai-je observe, et qu'est-ce qui manque ». Un non-developpeur doit
aujourd'hui ouvrir le code source pour repondre a cette question.

`explain` repond, et ne tranche rien.

## What Changes

- Ajouter `intentlane explain <sujet>` accepting a claim id, a capability id, or a
  diagnostic code, rendered in one structure.
- Composer uniquement ce que le code sait deja : le catalogue, les revendications, les
  diagnostics, et l'etat de derivation fourni.
- Ne produire ni lien Apple ni prose qui ne soit pas enregistres, et nommer le manque
  plutot que de l'inventer.
- Corriger la disponibilite de `AppIntentsTesting` dans le catalogue, qui annonçait un
  socle trop bas et rendait l'auditor muet sur un vrai blocage.

## Capabilities

### New Capabilities
- `explain`: un sujet se lit sans judgement, avec ce qui est observe, ce qui est derive,
  ce qui n'est pas prouve, et la preuve suivante.

### Modified Capabilities
- `capability-catalogue`: la disponibilite reelle d'`AppIntentsTesting`.

## Impact

`packages/core/src/explain.ts` neuf, `packages/cli` pour la commande, et une valeur du
catalogue corrigee. Aucun changement amont, aucun appel reseau, aucune PR.
