# Brief de découverte commerciale — questionnaire réutilisable

Usage : une session de 30 minutes avec l'équipe produit d'une app cliente avant
toute proposition. Les réponses alimentent la fiche de qualification et le
périmètre d'un pilote borné. Rien dans ce questionnaire n'est une promesse
Siri : on collecte des faits, on ne vend pas encore.

## 1. Objet ouvrable

- Quel est l'objet métier central que l'utilisateur cherche puis ouvre chaque
  jour (document, note, fichier, message, carte, projet…) ?
- Quels sont les objets secondaires (dossier, collection, filtre, recherche
  enregistrée) ?
- Pour chacun : le titre affiché est-il suffisant pour distinguer deux objets ?

## 2. Identifiant stable

- Chaque objet a-t-il un identifiant stable, non devinable, indépendant du
  titre ?
- L'identifiant survit-il à un changement de titre, un déplacement, une
  synchronisation, une réinstallation ?
- Deux objets ayant le même titre restent-ils distinguables ?

## 3. Recherche et homonymes

- Existe-t-il une recherche métier existante (écran, barre, API) ? Où doit
  atterrir un « chercher dans l'app » ?
- Comment sont gérés les homonymes (même titre dans deux dossiers/contextes) ?
- Que doit-il se passer pour un terme inexistant : zéro résultat, aucune
  navigation, aucun état modifié ?

## 4. Navigation

- Comment l'app ouvre-t-elle aujourd'hui un objet précis (routeur, sélection
  sidebar, deep link, onglet) ?
- Y a-t-il déjà des URL schemes, des activités utilisateur, des liens
  universels ?
- L'ouverture doit-elle toujours passer par le foreground, ou peut-elle être
  silencieuse ?

## 5. Plateformes

- Quelles plateformes Apple sont réellement livrées (macOS, iOS, iPadOS,
  watchOS, visionOS) et quelle est la version minimale supportée ?
- La même fonction est-elle développée de façon homogène sur ces plateformes ?
- Quelle est la cible OS du marché actuel de l'éditeur (ex. iOS/macOS 27) ?

## 6. Confidentialité

- Quelles données ne doivent jamais quitter l'app ni être indexées
  (contenu privé, secrets, jetons, URL privées, métadonnées confidentielles,
  données d'entreprise) ?
- Existe-t-il une politique écrite d'indexation / de projection minimale ?
- Les données de test sont-elles isolées (fixtures, comptes de test, aucune
  donnée réelle d'utilisateur) ?

## 7. Écritures et confirmations

- Quelles actions d'écriture existent (créer, modifier, déplacer, supprimer,
  publier, envoyer, partager) ?
- Pour chacune : est-elle réversible ? Quel est son niveau de risque ?
- Quelles protections sont acceptables pour l'éditeur : confirmation explicite,
  authentification, journal, contrôle d'appartenance, test négatif ?
- Y a-t-il déjà des actions Raccourcis / App Intents en production ?

## 8. Preuve manuelle

- Comment prouver un parcours sans le simuler : installation réelle, fixture,
  compte de test, OS et locale consignés ?
- Qui reproduit le parcours après le développeur (second testeur) ?
- Quel est le critère de succès observable (objet sélectionné, état visuel,
  dialog) pour chaque action ?

## 9. Maintenance et livraison

- Qui maintiendra l'adaptateur métier après livraison (équipe interne,
  contrat, document de transfert) ?
- L'équipe peut-elle absorber une PR, une mission ou un module généré ?
- Quels sont les canaux publics et la politique de contribution de l'éditeur
  (issues, design review, CI, licence) ?
- Quelle est la contrainte de livraison (App Store, test interne, build de
  démonstration) ?

## Règle de sortie

Une réponse « non confirmé » est une réponse. Aucune capacité n'est déclarée
absente ; une absence documentée s'écrit « non confirmé par la source ».