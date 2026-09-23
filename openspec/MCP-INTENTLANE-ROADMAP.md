# Roadmap MCP IntentLane

## Vision

IntentLane devient le contrat de capacités métier choisies. Il ne transforme
pas une app entière en outil pour agent. Chaque capacité est exposée une fois,
avec le même sens, les mêmes limites et les mêmes preuves, puis compilée vers
Apple et vers MCP.

```text
logique métier de l'app
          ↑
adaptateurs possédés par l'app
          ↑
contrat d'actions IntentLane
     ↙                 ↘
App Intents           tools MCP
Apple                 ChatGPT et autres clients
```

## A. Preuve Apple, préalable commercial

- [ ] Fermer le diff d'audit et le ledger de preuve.
- [ ] Prouver un vertical métier sur macOS et iOS, dont Siri réel et une
  reproduction indépendante.
- [ ] Vendre d'abord l'intégration Apple bornée, sans claim multi-LLM.

## B. Contrat canonique, premier changement MCP

- [ ] Fermer `add-mcp-action-plane`, sections 0 et 1.
- [ ] Préserver les contrats Apple actuels et versionner toute migration.
- [ ] Définir un catalogue minimal : recherche, lecture, ouverture, puis une
  mutation idempotente. Exclure la gestion universelle d'app.

## C. Tools MCP en lecture

- [ ] Générer les schémas de tool et interfaces d'adaptateur.
- [ ] Brancher un premier backend de pilote avec OAuth et droits par tenant.
- [ ] Vérifier pagination, filtrage de données et réponses sans secret.
- [ ] Prouver qu'un même parcours rend le même résultat métier via Apple et MCP.

## D. Écritures sûres

- [ ] Ajouter prévisualisation, confirmation, idempotence et trace d'audit.
- [ ] Tester refus de rôle, tenant, ownership et rejouement.
- [ ] Tester annulation, timeout et récupération sans double effet.
- [ ] Faire valider par un pilote les actions qui peuvent être déléguées à un agent.

## E. Runtime et clients

- [ ] Livrer la passerelle distante MCP en premier.
- [ ] Spécifier un pont macOS local seulement après un cas réel.
- [ ] Garder iOS comme client Apple ou backend MCP, jamais serveur local simulé.
- [ ] Tester ChatGPT et un second client MCP; documenter leurs différences de
  permissions, confirmation et disponibilité.

## F. Produit et distribution

- [ ] Créer une app ChatGPT/connecteur MCP avec OAuth et politique de données.
- [ ] Créer un package commercial par domaine et trois actions, pas un accès
  intégral à l'API cliente.
- [ ] Générer une documentation `llms.txt` et une référence d'actions, en
  précisant qu'elles décrivent les capacités sans accorder d'accès.
- [ ] Écrire une documentation approfondie, destinée aux intégrateurs et aux
  équipes sécurité : contrat, adapters, modèle de données, OAuth, scopes,
  confirmation, droits, ownership, logs, erreurs, disponibilité par
  plateforme, menaces, incident et révocation.
- [ ] Concevoir la landing HTML seulement après le premier cas vérifié. Elle
  doit inclure un avant/après d'app complexe et des schémas d'architecture
  éditables, sans claim qui dépasse les ledgers de preuve.
- [ ] Publier des études de cas seulement après ledger Apple et MCP vérifié.

## Gates

| Gate | Condition de fermeture |
| --- | --- |
| Apple foundation | Un parcours complet est vérifié sur chaque plateforme promise. |
| MCP read | Un client authentifié appelle des actions de lecture bornées sans fuite de données. |
| MCP write | Une mutation passe confirmation, droits, ownership, idempotence et audit log. |
| Multi-surface | Le même parcours est prouvé Apple et MCP, ou la différence est documentée. |
| Distribution | Le client cible découvre les tools, autorise les actions et présente les confirmations. |
