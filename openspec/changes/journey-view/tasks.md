## 1. Rendre le ledger lisible

- [x] Exposer le ledger parsé sur `PilotLedgerResult`, seulement quand la validation
      en a produit un.
- [x] Tester qu'une validation refusée n'expose rien, pour qu'aucune vue ne puisse
      construire un journey depuis un document rejeté.

## 2. La projection

- [x] Prendre le statut du ledger et les `ClaimOutcome` comme donnés, sans appeler la
      dérivation.
- [x] Refléter le statut et la raison de chaque revendication nommée.
- [x] Dire qu'un journey sans revendication n'est jamais vérifié, puisque des couches à
      `pass` ne sont pas une revendication.
- [x] Reporter la raison du ledger, y compris la reproduction absente, sur chaque
      journey.
- [x] Refuser tout journey qu'une revendication dépasse, puisque le validateur le
      rejette et qu'il n'y a donc rien à afficher.

## 3. Couches requises et état de preuve

- [x] Prendre l'union des `requires` des revendications nommées, sans doublon.
- [x] Compter une couche requise qui n'est pas à `pass` comme non satisfaite.
- [x] Afficher l'état de preuve comme information et écrire dans le rendu que ce n'est
      pas un verdict.

## 4. Reste à faire

- [ ] Dire quelle preuve manque et dans quel ordre, ce qui appartient à `plan`.
- [ ] Exposer la vue par une commande de lecture, une fois que `plan` la consomme, pour
      ne pas ajouter une surface qui n'a pas de consommateur.
- [ ] Ne pas déduire une revendication d'un statut de couche, maintenant ni jamais.
