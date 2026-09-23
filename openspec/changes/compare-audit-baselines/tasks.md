## 1. Contract and diagnostics

- [ ] 1.1 Ajouter les types publics `AuditInput`, `AuditDelta` et
  `AuditDeltaEntry`, avec parseur des documents à un rapport ou `reports`.
- [ ] 1.2 Ajouter `ILA170` (JSON invalide), `ILA171` (version inconnue),
  `ILA172` (plateforme absente d'un côté) et les verrouiller dans les tests.
- [ ] 1.3 Écrire les fixtures : progression, régression, capability ajoutée ou
  disparue, `both`, JSON invalide et version incompatible.

## 2. Core and CLI

- [ ] 2.1 Implémenter le module `audit-diff` et ses tests de déterminisme.
- [ ] 2.2 Ajouter `intentlane audit-diff <baseline> <candidate>` avec
  `--format text|json`, `--output` et `--fail-on regression`.
- [ ] 2.3 Ajouter les snapshots texte et JSON, y compris le contexte de cible,
  SDK, catalogue et conditions modifié.

## 3. Documentation and verification

- [ ] 3.1 Documenter la recette baseline puis delta dans `AUDIT-GUIDE.md` et
  `PILOT-PLAYBOOK.md`.
- [ ] 3.2 Passer `pnpm test`, `pnpm build` et `git diff --check`.

