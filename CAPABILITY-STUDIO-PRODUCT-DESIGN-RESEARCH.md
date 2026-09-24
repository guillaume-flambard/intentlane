# Capability Studio : recommandation produit et architecture de découverte

**Recherche effectuée le 23 septembre 2026.** Les assertions dépendantes d'un produit ou d'une plateforme sont reliées à une source primaire actuelle. Ce document ne valide pas encore une offre commerciale ni une faisabilité d'intégration propre à un client : il propose la forme du produit à prototyper.

## Recommandation nette

Construire **un produit web collaboratif, optimisé bureau**, et non une application macOS native comme produit initial. Ajouter ensuite :

1. une **application iOS compagnon**, orientée terrain et démonstration de scénarios (photo, géolocalisation éventuelle, notification, validation) ;
2. éventuellement un shell macOS si les ateliers hors ligne, la distribution App Store, ou une intégration système native deviennent des raisons métier prouvées.

Le produit n'est pas un générateur d'applications « à partir d'une phrase ». C'est un **atelier de cadrage exécutable et traçable** : il part d'un catalogue curé de capacités et de contraintes, rend les choix compréhensibles au client, puis produit un contrat versionné exploitable par le consultant, le métier et l'équipe technique.

La distinction est importante : le LLM peut proposer et expliquer ; **seul le catalogue versionné peut déclarer qu'une chose est disponible, conditionnelle, expérimentale ou hors périmètre**.

### Pourquoi web-first plutôt que macOS-first

| Critère | Web collaboratif bureau | macOS natif | iOS compagnon |
| --- | --- | --- | --- |
| Atelier avec un client externe | Très bon : lien sécurisé, commentaire et validation sans installation | Réservé à un Mac et à une installation | Trop étroit pour une modélisation dense |
| Cartes, matrice de dépendances, diagrammes, comparaisons | Très bon sur grand écran | Très bon | Mauvais comme surface principale |
| Multi-parties et partage asynchrone | Natif au produit | Demande des mécanismes serveur équivalents | Bon pour revue légère |
| Accès caméra et démonstration terrain | Correct mais variable | Faible | Excellent |
| Coût et vitesse du premier apprentissage | Le plus faible | Ajoute distribution, signature et maintenance plate-forme | À repousser après la preuve d'usage |

Apple confirme qu'un même projet peut cibler iOS, iPadOS et macOS, que SwiftUI est le choix par défaut pour une nouvelle application Apple multiplateforme, et que Mac Catalyst sert à porter une application iPad existante. Cela rend une extension native future possible, mais ne constitue pas une raison de limiter un atelier B2B partagé au Mac. [Apple, configuration multiplateforme](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target) ; [Apple, Mac Catalyst](https://developer.apple.com/documentation/uikit/mac-catalyst).

**Décision :** application web responsive avec une expérience prioritaire à partir de 1280 px, puis PWA/iOS seulement pour les scénarios terrain. Ne pas dépendre de Spotlight, Siri ou d'une capacité Apple dans le chemin de valeur initial.

## Ce que le produit doit résoudre

Un consultant a aujourd'hui deux échecs symétriques : promettre une automatisation qui n'est pas faisable, ou perdre une bonne possibilité parce qu'elle n'est pas connue pendant l'atelier. Capability Studio doit produire quatre résultats vérifiables :

1. **un périmètre lisible par le client** : ce qui est choisi, écarté, impossible, à confirmer ;
2. **un modèle de domaine versionné** : objets, rôles, états, règles et intégrations ;
3. **des parcours testables** : happy path, exception, intervention humaine et preuve attendue ;
4. **un plan réalisable** : dépendances, inconnues, spikes techniques, livrables et découpage de livraison.

Le précédent utile est Jira Product Discovery : il sépare les idées incertaines de la livraison engagée, relie une idée à ses éléments de preuve et à des tickets de livraison, et conserve un historique. Capability Studio doit reprendre cette séparation, mais la compléter avec le modèle métier exécutable et les contraintes techniques qu'un outil de roadmap généraliste ne modélise pas. [Atlassian, idées](https://www.atlassian.com/software/jira/product-discovery/guides/ideas/overview) ; [Atlassian, découverte vers livraison](https://www.atlassian.com/software/jira/product-discovery/guides/delivery/overview) ; [Atlassian, insights](https://www.atlassian.com/software/jira/product-discovery/guides/insights/overview).

## Positionnement : catalogue de capacités, pas catalogue de fonctionnalités

Une « capacité » est une unité métier observable, plus large qu'un écran et plus concrète qu'une idée. Exemple BTP : **Traiter une réserve sur photo**. Elle peut impliquer prise de photo, localisation, assignation, délai, relance, validation de résolution et journal de preuve.

Chaque capacité est fournie dans une version de catalogue et comporte obligatoirement :

| Champ | Rôle |
| --- | --- |
| Promesse et exemple | Une phrase métier et une mini-démo compréhensible par le client |
| Statut de faisabilité | `available`, `conditional`, `experimental`, `custom-build`, `not-automatable`, `unknown` |
| Raisons et alternative | Pourquoi c'est limité et quelle voie humaine ou semi-automatique reste possible |
| Acteurs et permissions | Rôles qui déclenchent, approuvent ou consultent |
| Préconditions | Données, qualité, équipement, intégrations, autorisations et règles nécessaires |
| Effets | Objets créés/modifiés, événements, notifications et preuve produite |
| Dépendances / conflits | Capacités requises, incompatibilités et ordre de livraison |
| Risques | Juridique, sécurité, sécurité physique, biais, qualité de donnée, réversibilité |
| Niveau de preuve | Démo, sandbox, intégration vérifiée chez un client, ou seulement hypothèse |
| Références | Source de la limitation, du connecteur ou de la règle métier |

Une fiche ne devient pas « disponible » parce qu'un modèle le dit. Sa déclaration est éditée par un propriétaire du catalogue, avec revue technique, date d'effet et provenance. Une capacité non encore évaluée reste `unknown`, jamais « non faisable » par défaut.

## Information architecture et expérience d'atelier

### Les six espaces

1. **Dossier client** : contexte, objectif, contraintes, personnes, documents source, hypothèses et décisions.
2. **Carte du problème** : acteurs, événements, irritants, flux existants, métriques de succès et zones sensibles. L'import de documents place des extraits comme *evidence*, pas comme vérité.
3. **Catalogue** : recherche par objectif, rôle, secteur et statut ; filtres « faisable sans intégration », « nécessite un humain », « à éviter ». Les cartes ont une vue « montrer au client » et une vue consultant plus technique.
4. **Scénario** : un canevas pas-à-pas où l'on dépose les capacités choisies, avec chemins d'exception et points de validation. Un scénario se joue comme une démo, pas seulement comme un diagramme.
5. **Contrat** : vue générée mais éditable du modèle de domaine, des règles, des permissions, de la matrice données/intégrations et des requirements. Les incohérences sont visibles ici.
6. **Plan et décision** : versions, diff, décisions à signer, inconnues, spikes, lots de livraison et export vers l'outil de delivery.

### Le déroulé d'un atelier de 90 minutes

1. **Cadrer (10 min)** : le consultant décrit le problème, importe seulement les documents autorisés, fixe la cible et les contraintes non négociables.
2. **Comprendre (15 min)** : l'outil affiche ses hypothèses et demande les faits manquants. Le client corrige, ne valide pas une « réponse IA » opaque.
3. **Explorer (30 min)** : le moteur propose 6 à 10 capacités maximum, avec trois groupes : recommandées, possibles sous conditions et non recommandées. Chaque carte raconte un exemple concret.
4. **Composer (20 min)** : le client coche, compare des variantes, puis voit les dépendances et conséquences. Toute incompatibilité exige une résolution explicite.
5. **Engager (15 min)** : le groupe valide une version de scénario. L'outil produit le périmètre, les décisions, les inconnues et les sujets de spike, mais pas un faux engagement de prix ou de délai.

### Démonstrations initiales

* **BatiNord, entreprise générale** : réserve photographiée -> assignation au sous-traitant -> échéance -> relance -> contrôle conducteur -> compte-rendu. La prédiction de retard est `experimental/advisory`, jamais une garantie ; modifier un contrat signé est `not-automatable`, avec proposition d'avenant à revue humaine.
* **HabitatPlus, gestion locative** : fuite déclarée -> qualification assistée -> routage vers un prestataire -> rendez-vous -> preuve d'intervention -> confirmation locataire. La qualification image est assistée et réversible ; la décision d'expulsion ou la certification de salubrité est hors automatisation, car elle requiert une procédure et une décision qualifiée.

## Modèle de données minimal

```text
CatalogRelease 1---* CapabilityDefinition 1---* CapabilityVersion
CapabilityVersion *---* DependencyEdge
CapabilityVersion *---* DomainPattern
CapabilityVersion *---* Evidence

Workspace 1---* DiscoveryCase 1---* CaseVersion
CaseVersion 1---* SelectedCapability
CaseVersion 1---* Scenario 1---* ScenarioStep
CaseVersion 1---* DomainEntity / Role / BusinessRule / IntegrationNeed
CaseVersion 1---* Decision / Assumption / Risk / OpenQuestion

SelectedCapability --> CapabilityVersion (immutable reference)
ScenarioStep --> DomainEntity, BusinessRule, Role, IntegrationNeed
Decision --> Evidence, actor, timestamp, rationale, approval state
```

Invariants à appliquer côté serveur :

* une sélection référence une version de capacité immuable ;
* toute capacité `conditional` doit laisser une précondition non résolue ou une confirmation ;
* aucune sortie « validée » ne peut contenir `unknown` sans décision signée de l'assumer ;
* un changement qui rompt une dépendance ouvre une incohérence bloquante ;
* l'export vers delivery ne contient que les éléments `committed`.

## IA : limites strictes et architecture recommandée

### LLM génératif : exploration et rédaction, jamais source de faisabilité

Le LLM reçoit le dossier client, les définitions de catalogue récupérées et les sources autorisées. Il peut :

* extraire acteurs, objectifs, contraintes et questions à poser ;
* suggérer un petit set de capacités existantes avec une justification liée à des passages source ;
* générer variantes de parcours, exemple de démonstration et brouillon de règles ;
* détecter des contradictions entre choix et préconditions ;
* rédiger le rapport de restitution à partir de la version validée.

Il ne peut pas créer une nouvelle capacité « validée », déclarer une intégration disponible, prendre une décision réglementaire, lancer une action métier chez le client, ni convertir automatiquement une ambiguïté en requirement.

Utiliser des sorties structurées, validées côté serveur, par exemple `CapabilityProposal[]`, `OpenQuestion[]`, `DomainModelPatch`, `Conflict[]` et `EvidenceLink[]`. La documentation OpenAI recommande les Structured Outputs lorsque l'application a besoin d'une réponse suivant un schéma : ils garantissent l'adhérence au JSON Schema fourni, contrairement au seul JSON mode ; les sorties incomplètes ou refusées restent à traiter explicitement. [OpenAI, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Les noms, descriptions et évaluations du schéma sont aussi des leviers de qualité recommandés par cette documentation.

**Pattern d'exécution :** retrieval du catalogue et des documents autorisés -> génération de proposition structurée -> validation de schéma -> moteur déterministe de dépendances -> affichage différentiel -> approbation humaine -> événement auditable. Pas d'agent autonome pour passer de proposition à engagement.

### Jev : décision bornée, après le catalogue

Jev est pertinent uniquement quand l'ensemble d'options est déjà défini. Sa documentation le présente avec trois primitives : `Choice` pour choisir parmi des options prédéfinies, `Score` pour un rubric, et `Noul` pour un jugement oui/non probabiliste. [Jev, SDK guide](https://www.jevtypesafe.org/docs/jev-sdk/). Cela en fait un bon candidat expérimental pour :

* classer une demande dans une taxonomie de capacités existante ;
* noter la suffisance du contexte pour déclencher une recommandation ;
* router vers « proposer », « demander une précision », « revue expert » ;
* évaluer si une justification cite bien les faits présents.

Ne pas l'utiliser pour inventer un schéma, décider qu'une automatisation est légalement acceptable, ni comme mécanisme unique de refus. Son service est actuellement cloud-only, sans modèle téléchargeable selon sa documentation, ce qui doit être examiné avec les exigences de résidence des données et les accords clients avant toute donnée sensible. [Limitation Jev](https://www.jevtypesafe.org/docs/jev-sdk/). Maintenir un routeur déterministe de secours et une évaluation labellisée : seuil de confiance seul = affichage de l'incertitude, pas permission d'agir.

## Gouvernance, sécurité et qualité

* **Droits par rôle** : le client commente et approuve son dossier ; seul le consultant/owner modifie le catalogue ; une approbation « technique » est distincte d'une approbation « métier ».
* **Provenance obligatoire** : chaque proposition IA porte le modèle, le prompt/version, les documents utilisés et les éléments du catalogue consultés. Les citations peuvent être masquées au client mais restent auditables.
* **Minimisation de données** : pas de connexion ERP/CRM dans le MVP. Import explicite, rétention limitée, redaction de PII avant appel modèle si possible, et choix du fournisseur documenté par dossier.
* **Safety by design** : actions à impact financier, contractuel, légal, sécurité physique, logement ou emploi sont toujours `human approval required`. Les états « non automatisable » et « incertain » sont des résultats positifs du produit.
* **Évaluations avant extension** : jeu de cas BTP/immobilier anonymisés, tests de faux positifs, d'omission de dépendance, de citations absentes et de proposition d'options interdites. Mesurer précision, couverture, taux de correction humaine et taux de décision reportée.

## MVP recommandé : 8 à 10 semaines après validation de maquette

### Inclus

1. Authentification, espace client, dossier et partage en lecture/commentaire.
2. Catalogue versionné de **30 à 40 capacités** dans un seul vertical pilote : BTP rénovation, avec 5 à 7 parcours canoniques et 8 à 10 capacités explicitement non automatisables/conditionnelles.
3. Fiche de capacité complète, recherche, filtres de faisabilité, comparaison et sélection.
4. Scenario builder simple, graphe de dépendances et validation déterministe.
5. LLM avec sortie structurée : extraction de contexte, proposition expliquée, questions manquantes et brouillon de restitution. Aucune connexion actionnable.
6. Versionnement du dossier, diff de sélection, journal de décision et export Markdown/PDF/JSON vers un backlog ou une spécification.
7. Prototype interactif de deux parcours BTP ; tests d'atelier avec trois consultants et trois clients potentiels.

### À reporter explicitement

* multi-vertical réel au lancement ;
* génération de code ou déploiement ;
* synchronisation bidirectionnelle CRM/ERP/Compta ;
* estimation automatique de coût/délai ou devis contractuel ;
* collaboration temps réel complexe, vidéoconférence, édition de diagramme libre ;
* App Store/macOS natif, iOS terrain et fonctions OS ;
* Jev en production avant benchmark sur un jeu étiqueté et revue des contraintes de données.

## Feuille de route de validation

| Phase | Question à trancher | Preuve de passage |
| --- | --- | --- |
| 0. Concierge | Le catalogue aide-t-il réellement un consultant à cadrer ? | 3 ateliers menés manuellement avec le prototype et un compte-rendu signé |
| 1. MVP BTP | Le client comprend-il choix, limites et dépendances ? | 80 % des participants expliquent correctement au moins 3 statuts et valident un scénario |
| 2. Qualité IA | Les propositions réduisent-elles le temps sans dégrader la qualité ? | Comparaison assistée/non assistée ; pas de hausse des dépendances critiques oubliées |
| 3. Répétabilité | Le consultant peut-il réemployer sans homogénéiser abusivement ? | 10 dossiers, catalogue amélioré par version, décisions traçables |
| 4. Extension immobilier | Les primitives du catalogue survivent-elles à un second secteur ? | Ajout par pack, sans modifier le noyau de modèle |
| 5. Mobile/natif | Le terrain crée-t-il une valeur qui justifie l'app dédiée ? | Usage répété d'une démo mobile dans les ateliers ou phase pilote |

## Décisions à prendre avant le premier build

1. Le premier acheteur est-il le consultant, l'intégrateur ou l'entreprise cliente ? Cela change permissions, prix et partage.
2. Le vertical initial est-il BTP rénovation ou gestion locative ? Ne pas démarrer les deux catalogues simultanément.
3. Quel niveau de preuve suffit pour un statut `available` ? Proposition : démo reproductible + contraintes documentées ; intégration client seulement après pilote.
4. Quels documents peuvent sortir de l'environnement du client vers un modèle hébergé ?
5. L'export prioritaire est-il un dossier de cadrage lisible, un backlog Jira/Linear, ou une spécification technique JSON ?

## Sources primaires consultées

* [OpenAI : Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
* [OpenAI : Agents](https://developers.openai.com/api/docs/guides/agents)
* [TypeSafe AI Jev : SDK Guide](https://www.jevtypesafe.org/docs/jev-sdk/)
* [Apple : configuration d'une app multiplateforme](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target)
* [Apple : Mac Catalyst](https://developer.apple.com/documentation/uikit/mac-catalyst)
* [Atlassian : Jira Product Discovery, ideas](https://www.atlassian.com/software/jira/product-discovery/guides/ideas/overview)
* [Atlassian : discovery vers delivery](https://www.atlassian.com/software/jira/product-discovery/guides/delivery/overview)
* [Atlassian : insights](https://www.atlassian.com/software/jira/product-discovery/guides/insights/overview)

