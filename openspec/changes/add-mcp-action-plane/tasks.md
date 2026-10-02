## 0. Product boundary

- [ ] 0.1 Écrire la promesse : IntentLane expose des capacités métier choisies,
  il ne donne jamais un contrôle universel de l'application.
- [ ] 0.2 Choisir un premier pilote qui possède un backend ou une API métier
  authentifiable, et trois actions bornées dont deux lectures et une écriture.
- [ ] 0.3 Vérifier licence, données, tenant, permissions et réversibilité de
  chaque action avant de générer une surface MCP.

## 1. Canonical contract

- [ ] 1.1 Concevoir `actions` dans le YAML : entrées/sorties, effet,
  confirmation, authorisation, ownership, idempotence et disponibilité.
- [ ] 1.2 Définir l'IR public et les diagnostics; refuser par défaut une
  mutation sans confirmation, autorisation et erreur publique définie.
- [ ] 1.3 Ajouter les migrations, fixtures positives et négatives, snapshots
  et la documentation de compatibilité avec le contrat 0.1.
- [ ] 1.4 Faire dériver les App Intents existants du contrat canonique sans
  changer leur sortie pour les configurations actuelles.

## 2. MCP generation, read-only first

- [ ] 2.1 Créer `@intentlane/generator-mcp`, qui émet les descriptions de
  tools, les schémas JSON, les descriptions de résultat et les interfaces
  d'adaptateur, de manière déterministe.
- [ ] 2.2 Générer uniquement les actions `read` activées, avec filtrage de
  propriétés sensibles et limites de pagination/volume.
- [ ] 2.3 Ajouter une implémentation de référence d'adaptateur sur un pilote,
  sans secret dans le contrat ni les sorties de test.
- [ ] 2.4 Vérifier les tools contre un inspecteur MCP et des tests qui
  comparent l'appel du tool au même résultat métier que l'App Intent.

## 2 bis. UI projection, dormant until 2.1 lands

- [ ] 2b.1 Étendre le contrat canonique avec des hints `presentation`
  optionnels sur la structure existante `intents` / `parameters`:
  `control` par paramètre, `preview`, `diff` et `success`. Aucun champ
  `fallback`: le comportement textuel est implicite. Le contrat 0.1 reste
  accepté sans `presentation`, et la valeur par défaut est le rendu texte.
- [ ] 2b.2 Émettre pour chaque action activée une ressource `ui://` déterministe
  et hors ligne, servie en `text/html;profile=mcp-app`, ainsi que le
  `_meta.ui.resourceUri` correspondant. Le contenu dérive du contrat canonique,
  jamais de l'AppIntent généré.
- [ ] 2b.3 Vérifier la dégradation SEP-2133: un client qui n'a pas négocié
  `io.modelcontextprotocol/ui` reçoit un résultat texte signifiant et sans
  perte, et aucun appel de tool ne dépend de la présence de l'UI.
- [ ] 2b.4 Tester que la confirmation d'une mutation est portée par le tool et
  l'hôte, qu'une iframe ne valide jamais seule une mutation, et que la parité
  multi-surface tient sur l'effet observé et non sur la présence d'une iframe.
- [ ] 2b.5 Tester que retirer tout le bloc `presentation` d'un contrat ne
  change ni l'effet, ni les paramètres, ni les exigences de l'intention. Un
  `presentation` dont la suppression change l'exécution est une sémantique mal
  placée et échoue ce test.

## 3. Gateway and authentication

- [ ] 3.1 Spécifier la passerelle MCP distante : OAuth, scopes par outil,
  tenant, expiration, révocation et journal d'audit.
- [ ] 3.2 Implémenter la séparation entre découverte de tools, autorisation et
  exécution. Aucun tool d'écriture ne s'exécute lors d'une simple découverte.
- [ ] 3.3 Tester utilisateurs, tenants et rôles distincts, ainsi que les
  réponses d'erreur minimisées.
- [ ] 3.4 Définir le pont macOS local comme un package distinct, avec accord
  utilisateur, cycle de vie du processus et refus lorsque l'app n'est pas
  installée ou disponible.
- [ ] 3.5 Documenter que l'intégration iOS MCP est serveur ou indisponible;
  ne jamais simuler un daemon local iOS.

## 4. Mutations and agent safety

- [ ] 4.1 Ajouter `write` sur une unique action pilote idempotente, avec clé de
  rejouement, prévisualisation et confirmation explicite du client.
- [ ] 4.2 Vérifier confirmation, ownership, droits de tenant, annulation,
  double soumission et erreurs réseau.
- [ ] 4.3 Ajouter des tests d'abus : paramètre injecté, ID hors tenant,
  escalade de rôle, répétition et récupération de donnée excessive.
- [ ] 4.4 Relier chaque écriture à une trace d'audit lisible par le client et
  à une procédure de révocation.

## 5. Apple parity and proof

- [ ] 5.1 Vérifier, pour le pilote, que chaque action partagée garde les mêmes
  effets, permissions, confirmations et erreurs côté Apple et MCP.
- [ ] 5.2 Exécuter les preuves Apple : build, métadonnées, Shortcuts,
  Spotlight si revendiqué et Siri manuel.
- [ ] 5.3 Exécuter les preuves MCP : inspection, authentification, lecture,
  écriture confirmée, refus et journal.
- [ ] 5.4 Ajouter le ledger de preuve multi-surface; une action ne devient pas
  publiable parce qu'elle marche seulement sur un des deux canaux.

## 6. Distribution and commercialisation

- [ ] 6.1 Préparer une app ChatGPT ou un connecteur MCP seulement après le
  pilote sécurisé, avec OAuth, politique de données et documentation client.
- [ ] 6.2 Tester la découverte, les permissions et les confirmations dans le
  client cible; documenter les limites de disponibilité par plan et plate-forme.
- [ ] 6.3 Créer une offre commerciale : audit de surface, package de trois
  actions, puis extension par domaine et non accès total à l'API.
- [ ] 6.4 Publier `llms.txt` uniquement comme documentation de découverte, sans
  le présenter comme un mécanisme d'accès ou d'autorisation.
- [ ] 6.5 Écrire la documentation approfondie avant toute distribution : modèle
  d'action, architecture Apple/MCP, installation, adaptateurs, OAuth, scopes,
  confirmations, ownership, erreurs, disponibilité macOS/iOS/backend,
  observabilité, menaces et récupération d'incident.
- [ ] 6.6 Créer la landing HTML uniquement après les premières preuves de
  pilote. Elle doit montrer un avant/après réel, le schéma d'architecture, les
  limitations et les preuves, sans promettre le contrôle total d'une app.
- [ ] 6.7 Créer les schémas visuels éditables pour la documentation et la
  landing après stabilisation du contrat canonique; la source des diagrammes
  reste versionnée avec les documents.
