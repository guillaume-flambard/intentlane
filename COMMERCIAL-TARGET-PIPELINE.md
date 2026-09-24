# Pipeline commercial IntentLane

Recherche initiale : 23 septembre 2026. Ce document distingue volontairement
les dépôts publics servant de banc d'essai des éditeurs auxquels nous pourrions
vendre une prestation. Une application connue n'est pas automatiquement un bon
prospect : si elle expose déjà la fonction recherchée, elle devient surtout une
référence de niveau attendu.

## Ce que nous vendons

Une offre n'est pas « ajoutons Siri partout ». C'est un pilote borné, avec une
preuve de bout en bout :

1. audit de la surface Apple existante et du modèle métier du client ;
2. une capacité de découverte, résolution et ouverture d'un objet réel ;
3. une action écrite seulement si son niveau de risque permet une confirmation
   et un contrôle d'autorisation ;
4. preuve sur les plateformes convenues, données de test et cas négatif ;
5. transfert d'un adaptateur métier que l'équipe cliente peut maintenir.

Le premier message commercial ne promet donc jamais une phrase précise ni une
couverture complète avant l'audit. Il propose un diagnostic, puis un pilote
fixe sur un objet et un résultat observables.

## Cibles commerciales à qualifier

| Priorité | Éditeur / produit | Pourquoi c'est une cible crédible | Premier pilote à proposer | Risque / état à confirmer |
| --- | --- | --- | --- | --- |
| 1 | **Goodnotes** | Marque internationale, documents et notes dont la valeur est dans la recherche et la reprise d'un document. La source publique trouvée ne décrit explicitement qu'un raccourci historique de création de QuickNote. | Retrouver un document autorisé par titre, présenter les correspondances, ouvrir le bon document. Puis créer une QuickNote avec confirmation. | Données souvent personnelles ou professionnelles. Audit de l'intégration OS 27 actuelle indispensable avant tout contact. |
| 2 | **MindNode** | Produit natif Mac, iPhone et iPad. Sa documentation publique décrit des Siri Shortcuts historiques pour créer, ouvrir, exporter et importer des documents, et indique vouloir aller plus loin dans l'automatisation. | Rechercher une carte par titre, présenter les cartes candidates, ouvrir celle choisie. Ensuite créer une carte depuis un brief confirmé. | Ne pas vendre les anciens raccourcis comme une lacune actuelle. Vérifier la version OS 27 dans l'app avant proposition. |
| 3 | **DEVONthink / DEVONthink To Go** | Gestion documentaire sophistiquée, objets bien identifiés, liens directs et recherche déjà structurée. La valeur d'une résolution fiable est forte. | Recherche minimale par métadonnées approuvées, liste de résultats, ouverture d'un document exact. | Très sensible : aucun contenu, chemin, tag confidentiel, OCR, URL privée ou donnée d'entreprise dans l'index sans politique écrite. Vente premium, pas premier pilote public. |
| 4 | **Tapbots, Ivory** | Produit Apple natif reconnu sur Mac, iPhone et iPad. Il possède des URL ciblées et des automatisations, donc le routeur métier existe déjà. | Retrouver et ouvrir un profil, une liste ou un post déjà disponible à l'utilisateur ; aucun post, boost, favori ou abonnement dans le premier lot. | Données de réseau social et comptes multiples. Vérifier l'intégration OS 27 déjà livrée. |
| 5 | **Readdle, Scanner Pro / Documents / PDF Expert** | Éditeur établi avec un portefeuille Apple, OCR et une documentation App Shortcuts. Scanner Pro documente notamment la recherche de scans par Siri. | Audit d'écart sur une seule app, puis recherche et ouverture d'un scan ou fichier local de test avec aperçu de résultats. | Données documentaires sensibles et produit probablement déjà mature. Cible de diagnostic, pas promesse d'un remplacement de leurs raccourcis. |

Cette liste est volontairement plus courte que la liste de dépôts publics :
elle privilégie des éditeurs ayant une application Apple native, des objets
ouvrables, une navigation existante, un historique d'automatisation et une
équipe produit capable d'absorber une PR ou une mission.

## Références, pas prospects de base

Les produits suivants démontrent ce qu'un résultat sérieux doit atteindre. Ils
ne sont pas de bonnes premières cibles pour vendre « search + open » car ils
ont déjà communiqué une couverture très proche, voire plus large :

| Produit | Ce que la source publique confirme | Positionnement IntentLane |
| --- | --- | --- |
| Craft | Siri recherche dans les documents, crée des documents et liste/crée des tâches. | Référence haut de gamme et audit de complément éventuel, pas prospection pour la fondation. |
| Things | Recherche Spotlight et Siri de tâches/projets sous OS 27, plus une riche surface Shortcuts. | Référence de granularité produit. Pas cible pour deux actions génériques. |
| Ulysses | Siri AI et App Intents couvrent déjà recherche, ouverture, création, déplacement et export de feuilles. | Référence pour une app d'écriture. Seulement une mission ciblée si leur équipe identifie un vrai écart. |
| Agenda | Recherche de notes, ouverture d'une note ou d'un projet, automatisation et assistant local. | Référence pour le modèle « liste de résultats puis ouverture ». |
| NotePlan | Siri AI et une surface App Intents incluant trouver, ouvrir et créer une note. | Référence de catalogue, pas cible de fondation. |

## Dépôts d'entraînement : pas des leads commerciaux

Le fichier [PUBLIC-PILOT-CANDIDATES.md](PUBLIC-PILOT-CANDIDATES.md) est le
banc d'essai technique. NetNewsWire, IINA, IceCubes, Nextcloud iOS et Home
Assistant ne doivent pas être confondus avec un pipeline de vente. Leur code
public permet de vérifier l'adaptateur, les contraintes de plateforme et les
limites de sécurité. Une contribution ou une prise de contact demande toujours
l'accord explicite du projet.

## Ordre commercial conseillé

1. Terminer et faire reproduire le parcours NetNewsWire déclaré, sans le
   présenter comme une validation de toutes les familles d'actions.
2. Produire une démonstration locale IINA ou IceCubes, pour prouver que le
   noyau ne dépend pas du lecteur RSS.
3. Préparer une fiche de découverte de 30 minutes pour Goodnotes, MindNode et
   DEVONthink : objets, navigation, données indexables, droits, opérations
   réversibles, plateformes et intégrations Apple déjà livrées.
4. Ne contacter qu'un éditeur dont cette fiche révèle un écart réel et une
   capacité ciblée vendable. Aucun cold outreach n'est lancé par ce document.

## Sources primaires à consulter avant un contact

- [Goodnotes, réponse officielle sur le raccourci QuickNote](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/32980147-ability-to-start-a-blank-page-straight-away)
- [MindNode, automatisation et Siri Shortcuts](https://www.mindnode.com/blog/2018-10-18-mindnode-5-2)
- [DEVONthink To Go, lancement d'un élément via raccourci](https://www.devontechnologies.com/blog/20230822-quickly-launch-devonthink-to-go)
- [Ivory, schémas d'URL supportés](https://tapbots.com/support/ivory/tips/urlschemes)
- [Readdle, surfaces App Shortcuts dans ses applications](https://readdle.com/blog/readdle-apps-ios16-updates)
- [Craft, Siri recherche les documents et agit sur les tâches](https://www.craft.do/blog/craft-update-3-6-5)
- [Things, intégration Spotlight et Siri sous OS 27](https://culturedcode.com/things/blog/)
- [Ulysses, limites et actions Siri AI livrées](https://help.ulysses.app/dive-into-editing/writing-tools)
- [Agenda, automatiser, rechercher et ouvrir des notes](https://agenda.com/manual/en/automating-agenda/)
- [NotePlan, surface App Intents](https://noteplan.co/changelog/v3.13-shortcuts-support)

## Qualification du 23 septembre 2026 (cinq cibles)

Recherche effectuée uniquement sur sources officielles (site produit, blog,
support, App Store). Aucune absence n'est affirmée : quand une source ne permet
pas de confirmer une capacité, la fiche écrit « non confirmé ».

| Classement | Éditeur | Risque | Verdict |
| --- | --- | --- | --- |
| Approcher après démonstration | Tapbots Ivory | moyen | écart plausible sur la surface système OS 27 ; routeur métier déjà existant |
| Audit préalable obligatoire | Goodnotes | moyen/élevé | gros potentiel, données de carnets sensibles, état OS 27 à auditer avant contact |
| Audit préalable obligatoire | DEVONthink / DTTG | élevé | premium, très sensible, politique d'indexation écrite exigée |
| Référence concurrentielle | MindNode | moyen | surface Shortcuts + App Shortcuts déjà riche ; pas de fondation à vendre |
| Référence concurrentielle | Readdle (Scanner Pro, Documents, PDF Expert) | élevé | App Intents + recherche sémantique iOS 27 déjà livrées |

### 1. Goodnotes

- **Plateformes** : iPhone, iPad (Goodnotes 6). macOS : non confirmé.
- **Objets métier** : carnet (notebook), document, page, recherche de notes.
- **Intégrations documentées** : recherche interne puissante (support officiel
  « Search your notes ») ; quelques actions Raccourcis basiques (source :
  forum de suggestions officiel, 2023) ; suggestions Siri historiques d'ouverture
  de carnet et de QuickNote. `system.open`, `system.searchInApp`, `IndexedEntity` :
  non confirmés.
- **Écart à vérifier** : la surface App Intents / système OS 27 actuelle de
  Goodnotes, sans la déduire des anciens raccourcis.
- **Pilote vendable** : retrouver un carnet ou document autorisé par titre,
  présenter les correspondances, ouvrir le bon document.
- **Données à ne jamais indexer** : contenu des pages, notes manuscrites/OCR,
  modèles, métadonnées privées de carnet.
- **Décideur/équipe** : équipe produit Goodnotes ; canal public de demandes
  (feedback.goodnotes.com).
- **Sources** : support.goodnotes.com (Search your notes) ;
  feedback.goodnotes.com (suggestions Raccourcis).

### 2. MindNode

- **Plateformes** : Mac, iPhone, iPad, Apple Watch, Apple Vision Pro.
- **Objets métier** : document (carte mentale), nœud, tag.
- **Intégrations documentées** : Raccourcis riches officiels — Document
  (Create, Delete, Export, Find, Get Current, Import, Open, Open Recent,
  Rename), Node (Create, Delete, Edit, Find), Tag (Find) ; App Shortcuts sur
  Mac/iOS (long-press : démarrer une carte, ouvrir le dernier document) ;
  refonte « MindNode Next » (2025) étendant l'automatisation, base posée pour
  Apple Intelligence.
- **Écart à vérifier** : `system.open`, `system.searchInApp`, donation
  `IndexedEntity`/Spotlight : non confirmés.
- **Pilote vendable** : une mission ciblée uniquement si leur équipe identifie
  un écart réel sur la surface système ; pas la fondation search+open (déjà
  couverte en Raccourcis).
- **Données à ne jamais indexer** : contenu des nœuds, notes, texte des cartes.
- **Décideur/équipe** : équipe MindNode (IdeasOnCanvas), blog officiel.
- **Sources** : mindnode.com/support/guides/apple-shortcuts ;
  mindnode.com/blog/a-new-era-of-automation-in-mindnode (2025) ;
  mindnode.com/apple.

### 3. DEVONthink / DEVONthink To Go

- **Plateformes** : Mac (DEVONthink), iPhone/iPad (To Go).
- **Objets métier** : base/groupe, document, enregistrement (tout type), groupe
  intelligent, recherche structurée.
- **Intégrations documentées** : indexation Spotlight optionnelle du contenu
  des bases (manuel officiel) ; liens d'élément + raccourci « DT Quick Launch »
  (blog officiel) ; raccourcis clavier contextuels macOS. App Intents /
  `system.open` / `system.searchInApp` : non confirmés.
- **Écart à vérifier** : une surface système Apple officielle dans DEVONthink 3 /
  To Go, après audit.
- **Pilote vendable** : recherche minimale par métadonnées approuvées, liste de
  résultats, ouverture d'un document exact.
- **Données à ne jamais indexer** : contenu, chemins, tags confidentiels, OCR,
  URL privées, données d'entreprise, sans politique écrite.
- **Décideur/équipe** : DEVONtechnologies (équipe DEVONthink), blog officiel.
- **Sources** : devontechnologies.com/blog/20230822-quickly-launch-devonthink-to-go ;
  manuel DEVONthink 3.9.1 (indexation Spotlight).

### 4. Tapbots Ivory

- **Plateformes** : Mac, iPhone, iPad.
- **Objets métier** : compte (`@user@host`), timeline, liste, statut/post,
  profil utilisateur, recherche.
- **Intégrations documentées** : schémas d'URL officiels
  (`ivory://acct/`, `ivory://acct/openURL?url=`, profils, statuts, listes) ;
  action Raccourcis « Open Ivory » paramétrable ; action d'ouverture de
  l'onglet Lists ; widgets. App Intents `system.open`/`searchInApp`/
  `IndexedEntity` : non confirmés.
- **Écart à vérifier** : la surface App Intents système OS 27 déjà livrée et le
  modèle de comptes multiples.
- **Pilote vendable** : retrouver et ouvrir un profil, une liste ou un post déjà
  accessible à l'utilisateur ; aucun post, boost, favori ou abonnement au
  premier lot.
- **Données à ne jamais indexer** : messages directs, listes privées, abonnés,
  jetons d'accès, posts à visibilité limitée.
- **Décideur/équipe** : Tapbots (équipe Ivory).
- **Sources** : tapbots.com/support/ivory/tips/urlschemes ;
  tapbots.com/support/ivory.

### 5. Readdle (Scanner Pro, Documents, PDF Expert)

- **Plateformes** : iPhone, iPad (PDF Expert aussi sur Mac).
- **Objets métier** : scan, document/fichier, PDF, dossier, récents/favoris.
- **Intégrations documentées** : surface très avancée et récente — App Shortcuts
  iOS 16 (Scanner Pro : scanner, dernier scan, recherche de scans) ; Spotlight
  iOS 17 (PDF Expert : Convertir/Merger/Compresser/Scanner ; Documents :
  recherche) ; iOS 27 (2026-09-14) : App Intents approfondis, recherche
  sémantique, actions Siri (Scanner Pro : traduire, résumer des reçus, exporter
  un PDF, joindre un scan) ; Documents : trouver/ouvrir/enregistrer.
- **Écart à vérifier** : uniquement un complément ciblé, si un écart réel existe ;
  pas une promesse de remplacement de leurs raccourcis.
- **Pilote vendable** : audit d'écart sur une seule app, puis recherche et
  ouverture d'un scan ou fichier de test local avec aperçu.
- **Données à ne jamais indexer** : contenu des documents, scans, reçus, OCR.
- **Décideur/équipe** : équipe Readdle (blog officiel).
- **Sources** : readdle.com/blog/ios-27-ready (2026-09-14) ;
  readdle.com/blog/readdle-apps-ios16-updates ;
  readdle.com/blog/readdle-apps-ios17-updates.

## Note de méthode

Ce classement ne donne à personne l'autorisation de contacter ces éditeurs : il
ordonne les fiches de découverte. Seule une fiche révélant un écart réel et une
capacité ciblée vendable autorise une prise de contact, après reproduction
indépendante du pilote NetNewsWire.
