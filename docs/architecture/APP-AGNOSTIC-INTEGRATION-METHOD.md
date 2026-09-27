# Méthode d'intégration agnostique IntentLane

## But

IntentLane ne promet pas qu'une phrase Siri peut piloter n'importe quelle
fonction arbitraire. Il transforme une capacité réelle de l'application en un
contrat Apple, un adaptateur métier et une preuve. Le coeur est réutilisable;
le seul code propre au client est le mapping entre ses objets, son stockage,
ses règles d'accès et sa navigation.

## Les cinq couches, toujours dans cet ordre

1. **Inventaire métier**. Lire l'application sans l'écrire. Nommer les objets
   réels, leurs identifiants stables, leurs droits, leurs données sensibles et
   leurs effets de bord.
2. **Choix de surface**. Choisir soit un schéma Apple adapté, soit une action
   App Intent personnalisée clairement étiquetée comme automatisation. Ne
   jamais présenter Raccourcis comme une capacité Siri AI.
3. **Projection agnostique**. Générer l'entité, sa présentation localisée,
   sa requête par ID, sa résolution textuelle, l'indexation et le squelette
   d'adaptateur. L'adaptateur client résout l'objet, autorise l'opération et
   appelle son routeur UI existant.
4. **Protection**. N'indexer que le minimum utile. Pour toute écriture,
   contrôler l'appartenance, l'autorisation, l'état courant et les conflits;
   exiger confirmation et authentification quand le risque le requiert.
5. **Preuve**. Tester le contrat hors processus, compiler les métadonnées,
   puis observer la surface annoncée. Ajouter un test négatif. Une seconde
   personne reproduit avant toute promesse commerciale.

La chaîne `intentlane verify` automatise les quatre premières preuves
techniques : contrat, génération, test métier de l'application et métadonnées
extraites du build. Elle garde l'observation Siri/Spotlight comme une porte
distincte, afin qu'un build vert ne soit jamais présenté comme une expérience
conversationnelle validée. Le détail du protocole est dans
[AUTOMATED-VERIFICATION.md](../spec/AUTOMATED-VERIFICATION.md).

## Contrat universel pour un objet ouvrable

Une application de contenu, de dossier, de projet, de document ou de message
utilise le même noyau :

| Élément | Contrat IntentLane | Reste chez le client |
| --- | --- | --- |
| Identité | `AppEntity.id`, stable et non devinable | ID de base de données ou de synchronisation |
| Présentation | titre, sous-titre, image facultative, synonymes | règles de confidentialité et ressources locales |
| Résolution | `EntityQuery`, `EntityStringQuery`, suggestions | recherche métier, accès et tri |
| Découverte | `IndexedEntity`, index et réindexation | événements create/update/delete et périmètre indexable |
| Ouverture | `OpenIntent(target:)` | navigation exacte dans l'UI existante |
| Recherche | `SearchInApp` seulement pour une vraie liste interne | écran de recherche existant |

Le système contrôle le rendu de Siri et Spotlight. IntentLane fournit des
entités distinctes et riches, jamais une fausse interface Siri. Deux objets
qui ont le même libellé gardent des IDs distincts et doivent pouvoir être
présentés comme deux choix.

## Règles de décision

- **Objet trouvé puis ouvert** : `OpenIntent` et une entité résolue. C'est le
  parcours comparable à la sélection d'un e-mail dans Siri.
- **Recherche dans l'application** : `SearchInApp`. Il mène à la liste
  applicative, pas à un objet arbitrairement choisi.
- **Écriture sûre et réversible** : App Intent personnalisé avec l'objet comme
  paramètre, validation et résultat observable. Elle peut être offerte dans
  Raccourcis; elle ne devient pas un schéma Apple par déclaration.
- **Suppression, envoi, publication, paiement, partage externe** : risque
  élevé. Confirmation explicite, authentification, journal et test négatif
  obligatoires.
- **Pas de schéma Apple adapté** : ne pas vendre de Siri AI. Proposer une
  automatisation App Intent ou ne rien proposer.

## Dossier client minimal

Pour chaque capacité : schéma ou surface, objet cible, champs exposés,
autorisation, effet attendu, annulation, texte localisé, test contractuel,
test système, test manuel, négatif, OS, locale et preuve indépendante.

## Ce que le générateur ne doit jamais deviner

L'emplacement des données, le droit de l'utilisateur, le routeur de
navigation, le niveau de sensibilité, la politique de rétention, ni une
substitution approximative d'objet. Ces décisions restent dans l'adaptateur
métier contrôlé et revu avec le client.

## Références

- [Apple: OpenIntent](https://developer.apple.com/documentation/appintents/openintent)
- [Apple: Entity queries](https://developer.apple.com/documentation/appintents/entity-queries)
- [Apple: Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight)
- [Apple: ShowInAppSearchResultsIntent](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent)
