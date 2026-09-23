## Context

Les App Intents sont une surface Apple. Elles rendent les actions et données
découvrables par Siri, Apple Intelligence, Shortcuts et Spotlight. Elles ne
constituent pas un protocole que ChatGPT peut découvrir et appeler directement.
MCP est une surface de tools distincte : le client lit des descriptions de
tools puis appelle un serveur qui applique authentification et autorisation.

Sources d'autorité :

- Apple App Intents : https://developer.apple.com/documentation/appintents
- OpenAI Apps SDK : https://help.openai.com/en/articles/12515353-build-with-the-apps-sdk
- OpenAI MCP : https://developers.openai.com/api/docs/guides/tools-connectors-mcp

## Architecture

```text
                 Contrat d'action IntentLane
                 action, entité, paramètres, risque
                              |
               +--------------+--------------+
               |                             |
        Générateur Apple                Générateur MCP
               |                             |
   App Intent + interface Swift     Schéma de tool + interface serveur
               |                             |
      adaptateur métier iOS/macOS     adaptateur métier ou API backend
               |                             |
  Siri, Shortcuts, Spotlight       ChatGPT, Claude, clients MCP
```

Le contrat ne décrit pas l'implémentation interne. Il décrit le plus petit
verbe métier publiable. Exemple : `find_article`, `open_article`,
`mark_article_read`. L'adaptateur est la seule partie qui connaît le store,
les identifiants, les permissions, le réseau et la navigation de l'app.

## Canonical action model

Chaque action doit déclarer :

| Champ | Raison |
| --- | --- |
| `id`, titre et description | Identité stable et description destinée au système ou au LLM. |
| entrée et sortie typées | Le client ne déduit pas les paramètres depuis une UI. |
| `effect` | `read`, `write`, `sensitive` ou `destructive`. |
| confirmation | Distingue un aperçu sans effet d'une mutation effective. |
| autorisation et ownership | L'adaptateur vérifie l'utilisateur, le tenant et les droits sur l'entité. |
| idempotence | Permet au client de rejouer une requête sans dupliquer une mutation. |
| disponibilité | Déclare macOS, iOS, backend ou pont local, jamais une promesse globale. |
| erreurs publiques | Évite d'exposer des erreurs internes ou des secrets dans le contexte du modèle. |
| preuve requise | Lie chaque action à tests, trace d'audit et validation système. |

## Transport and platform boundaries

Un serveur MCP distant est la voie principale pour une app qui possède un
backend : OAuth, tenant, audit log et politique de confirmation restent côté
serveur. Un pont macOS local est une voie secondaire, disponible seulement si
un client approuvé peut joindre un processus local et si l'utilisateur a donné
son accord. iOS ne doit pas être traité comme un serveur local : sa sortie MCP
utilise le backend de l'app ou reste indisponible.

Le générateur Apple et le générateur MCP partagent les noms, types, effets et
scénarios de test. Ils ne partagent pas nécessairement le transport ou la
forme d'authentification.

## Safety model

1. Les actions `read` peuvent être exposées après autorisation de lecture.
2. Les actions `write`, `sensitive` et `destructive` exigent une politique de
   confirmation explicite, un contrôle serveur des droits et une trace d'audit.
3. Les tools renvoient des valeurs minimisées. Ils ne retournent jamais token,
   secret, contenu hors scope ou erreur interne brute.
4. Une app ne publie que les actions activées par son propriétaire. L'absence
   d'une action est sûre par défaut.
5. Les tests de sécurité cherchent les rejouements, élévations de tenant,
   erreurs de confirmation et appels hors disponibilité de plateforme.

## Delivery sequence

La première livraison MCP est lecture seule et ne bloque pas le lancement
Apple. Les écritures arrivent uniquement après les évaluations de sûreté et un
pilote qui accepte les conditions d'authentification. Une app ChatGPT est une
couche de distribution finale, pas le runtime métier.

