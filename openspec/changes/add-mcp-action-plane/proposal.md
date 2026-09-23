## Why

IntentLane décrit déjà des actions métier pour les surfaces Apple. Ces actions
ne sont cependant pas directement appelables par ChatGPT ou un autre client
MCP. Un contrôle d'écran généraliste peut contourner ce manque, mais il est
fragile, ne connaît ni les droits métier ni les effets d'une action, et casse
quand l'interface évolue.

Le produit doit conserver une seule définition d'action et l'exposer sur deux
plans : App Intents pour les expériences Apple et MCP pour les agents. Le
client ne doit jamais recevoir l'API interne complète de l'application.

## What Changes

- Ajoute un contrat d'action canonique indépendant d'Apple et de MCP.
- Étend le contrat IntentLane avec l'autorisation, l'effet, la confirmation,
  l'idempotence, le propriétaire de donnée et la sémantique d'erreur requise
  par une action pilotable par un agent.
- Génère une description de tool MCP et une interface d'adaptateur à partir de
  ce contrat, sans exposer de secret ni de logique métier.
- Définit les voies de livraison séparées : passerelle distante authentifiée,
  pont macOS local optionnel et intégration App Intents native.
- Ajoute des preuves de sécurité et de comportement avant toute action d'écriture.

## Non-goals

- Ne fait pas d'un App Intent existant un endpoint MCP automatiquement.
- Ne lance pas de serveur MCP à l'intérieur d'une app iOS ni ne contourne le
  sandbox, les permissions système ou l'authentification du client.
- Ne publie pas une app ChatGPT, ne distribue pas de credentials et ne promet
  pas la compatibilité de chaque client MCP dans cette première tranche.

## Impact

Le schéma IntentLane, le core, le générateur Apple, un nouveau générateur MCP,
les adaptateurs de l'application cliente, les tests de sécurité et la future
distribution ChatGPT.

