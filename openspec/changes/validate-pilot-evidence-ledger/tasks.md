## 1. Contract and fixtures

- [ ] 1.1 Définir le schéma YAML `pilot-evidence/1.0`, types publics et exemples
  minimaux macOS et iOS sans donnée sensible.
- [ ] 1.2 Ajouter `ILA173` (ledger invalide), `ILA174` (couche requise absente
  ou non passée) et `ILA175` (reproduction indépendante absente ou non passée).
- [ ] 1.3 Écrire les fixtures positives, Siri bloqué, surface non revendiquée,
  action risquée incomplète et seconde reproduction échouée.

## 2. Core and CLI

- [ ] 2.1 Implémenter `pilot-ledger` et les tests de validation déterministe.
- [ ] 2.2 Ajouter `intentlane evidence validate <ledger>` avec
  `--format text|json` et `--strict` qui échoue quand le ledger est unverified.
- [ ] 2.3 Émettre un résumé qui distingue explicitement `verified` et
  `unverified`, ainsi que les couches et parcours bloquants.

## 3. Documentation and verification

- [ ] 3.1 Ajouter un template de ledger au playbook et lier la baseline et le
  delta d'audit comme artefacts référencés.
- [ ] 3.2 Mettre à jour `COMMERCIAL-READINESS.md` : aucun cas d'étude ne peut
  dépasser le statut calculé du ledger.
- [ ] 3.3 Passer `pnpm test`, `pnpm build` et `git diff --check`.

