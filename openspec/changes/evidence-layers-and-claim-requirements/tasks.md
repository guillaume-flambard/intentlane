# Tâches

## 1. Vocabulaire des couches

- [x] Ajouter `metadata`, `runtime`, `query` et `annotations` à
      `PILOT_LEDGER_LAYERS`, dans l'ordre du pipeline.
- [x] Ne pas changer `PILOT_LEDGER_VERSION`, et le prouver par un test.
- [x] Garder le refus d'une couche inconnue, et le prouver par un test.
- [x] Prouver sur `pilots/iina/evidence-ledger.yaml` que les six diagnostics sont
      identiques et qu'aucun ne nomme une couche ajoutée.

## 2. Couches revendiquables

- [x] Faire entrer les quatre nouvelles couches dans
      `PILOT_LEDGER_CLAIMABLE_LAYERS`, sinon aucune revendication ne pourrait les
      exiger.
- [x] Garder `contract` et `build` hors de cet ensemble.
- [x] Tester que toute couche requise par une revendication est soit globale, soit
      revendiquable.

## 3. Exigences par revendication

- [x] Ajouter `requires` sur `PilotClaim`.
- [x] Renseigner les neuf revendications.
- [x] Tester qu'aucune revendication ne déclare une couche vide ou inconnue.
- [x] Tester qu'une revendication observée exige au moins une couche au-delà de la
      paire globale.
- [x] Épingler `indexSync` sur les couches qu'un index réel exige, et `registration`
      sur `runtime`, pour que la carte reste vérifiable plutôt que déclarative.

## 4. Reste à faire, hors de cette change

- [ ] Lier un journey à ses revendications par `claims?:` et produire les deux
      diagnostics, un claim inconnu et une exigence non couverte par le journey.
- [ ] Ne déduire aucune revendication depuis un statut de couche. C'est la condition
      pour que la liaison soit utile.
- [ ] Déclarer la revendication du harnais `AppIntentsTesting`, qui.require `runtime`,
      une fois le harnais généré.
