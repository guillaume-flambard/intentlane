## Why

Les équipes ne savent pas si leur app est éligible à Siri et Apple Intelligence avant une intégration coûteuse. IntentLane doit produire un audit fondé sur des preuves, distinct des simples raccourcis.

## What Changes

- Ajoute `intentlane audit`, analyseur local et read-only de projets macOS et iOS.
- Produit un rapport texte, JSON et SARIF avec état, preuve, plateforme et prochaine action.
- Distingue disponibilité SDK, implémentation, test, faisabilité et blocage.

## Capabilities

### New Capabilities
- `capability-audit`: Audit déterministe des capacités App Intents d'un dépôt.

### Modified Capabilities
- Aucun.

## Impact

CLI, package core, catalogue SDK, fixtures et diagnostics `ILA`.
