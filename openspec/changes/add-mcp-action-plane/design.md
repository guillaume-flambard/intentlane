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
- MCP Apps, spec stable `2026-01-26` : https://modelcontextprotocol.io/docs/extensions/apps
- Annonce de l'extension, 2026-01-26 : https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps

## Architecture

Le détail des projections, dont la troisième, est dans
[Projections](#projections). Ce diagramme ne montre que le chemin d'exécution
des deux surfaces livrées en premier.

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

## Projections

Le contrat canonique a trois projections, pas deux. Toutes trois dérivent du
contrat, jamais l'une de l'autre. En particulier l'UI ne se dérive pas de
l'`AppIntent` : elle se dérive du contrat, exactement comme les deux autres
surfaces. Une UI dérivée d'un artefact Apple hériterait de ses contraintes et
de ses noms sans partager son sens.

```text
              Contrat canonique de capacité
                        |
        +---------------+----------------+
        |               |                |
   Projection       Projection      Projection
     Apple             MCP             UI
        |               |                |
 AppIntent          tool schema     ui:// resource
 AppEntity          + result        text/html;profile=mcp-app
 App Schema
        |               |                |
  Siri, Shortcuts,  ChatGPT,        rendu dans le
  Spotlight         Claude,         client hôte
                    clients MCP
```

### Projection UI

MCP Apps est une extension officielle de MCP, spec stable `2026-01-26`,
identifiant `io.modelcontextprotocol/ui`. Un tool déclare
`_meta.ui.resourceUri`, qui pointe vers une ressource `ui://` servie en
`text/html;profile=mcp-app`. Le hôte la récupère par `resources/read` et la rend
dans une iframe sandboxée. Le serveur n'envoie ni ne reçoit aucun message
`ui/*` : ce trafic va du hôte à l'iframe.

Ce que le contrat peut porter comme hints pour une projection UI, tous
optionnels :

| Élément | Raison |
| --- | --- |
| `presentation.control` par paramètre | `textarea` pour un texte long, pas une ligne de saisie qui tronque. |
| `presentation.preview` | L'entité et les champs à afficher avant une mutation, pour que l'utilisateur voie l'effet. |
| `presentation.diff` | Distingue « voici l'état courant » de « voici ce qui change ». |
| `presentation.success` | Ce que l'UI montre après une confirmation, et qui doit venir du résultat réel, pas d'un texte optimiste. |

Le fallback textuel n'est pas un champ du contrat. C'est le comportement par
défaut de toute projection MCP : un client qui ne rend pas d'interface reçoit le
résultat texte du tool. Le runtime le sait déjà, donc le contrat ne le
transporte pas. Un override n'apparaîtra que si un pilote réel démontre qu'un
cas le demande.

### Sémantique contre hints

Le contrat se divise en deux, et la frontière est normative :

```text
CONTRAT CANONIQUE
│
├── sémantique
│   ├── intents
│   ├── parameters
│   ├── entities
│   └── risk.confirmation
│
└── hints de présentation   optionnels
    ├── control
    ├── preview
    ├── diff
    └── success
```

`risk.confirmation` est normatif : une confirmation est requise, quel que soit
le hôte. Un hint ne l'est pas au même degré : `presentation.control: textarea`
signifie « si le hôte dispose d'une UI compatible, voici une représentation
souhaitable », et rien de plus. ChatGPT, Claude ou un client text-only exécutent
exactement la même capability en ignorant `presentation`.

La règle de validité est donc une seule : enlever entièrement `presentation` ne
doit changer ni l'effet de l'intention, ni ses paramètres, ni ce qu'elle
exige. Si l'exécution en dépend, la sémantique est mal placée et doit remonter
dans `risk` ou dans l'adaptateur. `presentation` ne contient aucune logique
métier.

### Nomenclature conservée

Le contrat reste `intents`, `parameters`, `risk.confirmation`. Un exemple
présenté en discussion avec `capability`, `inputs` et `mutation` était
illustratif et ne proposait aucun renommage. `capability/inputs/mutation` ne
doit pas devenir le contrat 0.2, et le contrat 0.1 reste accepté tel quel.

Les hints `presentation` décrits ici restent une extension envisagée, dormante
tant que la tâche 2.1 n'est pas activée. Tant qu'elle ne l'est pas, le contrat
0.1 est le seul contrat implémenté, et il ne contient aucun champ
`presentation`.

### Règles de dégradation

SEP-2133 impose qu'une extension dégrade proprement : un tool porteur d'UI doit
continuer renvoyer du texte significatif à un client qui n'a pas négocié
`io.modelcontextprotocol/ui`. L'hôte expose cette intention par
`client_supports_apps`, et le serveur teste avant de choisir.

Trois règles en découlent :

1. La ressource `ui://` est un complément, jamais le canal unique du résultat.
   Le tool rend son texte d'abord, l'UI ensuite.
2. Le contenu `ui://` est déterministe et hors ligne, comme le reste de la
   génération. Une ressource qui dépend du réseau à l'affichage n'est pas une
   ressource générée.
3. La confirmation d'une mutation est portée par le tool et par l'hôte, pas par
   l'iframe. Une iframe qui valide seule une mutation contourne le modèle de
   sûreté et n'est pas une projection acceptable.

Le test de parité multi-surface porte donc sur l'effet observable, pas sur la
présence d'une iframe : même mutation, même confirmation, même résultat vu par
le modèle, que l'hôte rende l'UI ou non.

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

