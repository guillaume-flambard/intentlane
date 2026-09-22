# Angles à ne pas manquer

Cette note complète la roadmap Siri 27. Chaque angle devient un contrôle de
l'auditeur ou une hypothèse à valider avant de le vendre.

## 1. Le produit de découverte avant le produit de génération

Le signal commercial peut être détecté avant tout changement de code : app
macOS ou iOS avec contenu et actions, mais sans `AppIntents`, `AppEntity`,
`IndexedEntity` ou App Schema. L'audit gratuit ou peu coûteux devient le
produit d'entrée et la source de prospects. Il faut construire un score de
compatibilité, pas seulement un compilateur.

## 2. Les deux promesses sont différentes

Les App Shortcuts couvrent les actions fréquentes, généralement deux à cinq,
avec une phrase contenant le nom de l'app. Les App Schemas, les entités et
l'indexation couvrent la compréhension de contenu et les parcours Siri plus
riches. L'auditeur doit les séparer, sinon une app pourra sembler compatible
alors qu'elle ne possède que des raccourcis. Source :
[Apple App Shortcuts](https://developer.apple.com/documentation/appintents/acceleratingappinteractionswithappintents).

## 3. L'index est un produit de données et de confidentialité

`IndexedEntity` permet à Spotlight et Apple Intelligence de découvrir le
contenu, mais impose un cycle de vie : indexer, mettre à jour, supprimer et
réindexer. L'audit doit aussi classer les données indexées, vérifier le consentement
pour le contenu privé et refuser le discours marketing quand ce cycle n'existe
pas. Source : [Apple IndexedEntity](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight).

## 4. La qualité de l'action est une surface UX

La réussite ne se réduit pas à `perform()`. Les réponses doivent fonctionner
sans écran, les titres et paramètres doivent être compréhensibles, et les
phrases doivent rester courtes. L'offre peut inclure un audit conversationnel
des cinq actions principales, de leurs erreurs et de leurs confirmations.

## 5. Le meilleur premier marché est le contenu local ou synchronisé

Les apps dont les objets peuvent être résolus localement et indexés offrent le
parcours le plus démontrable. Les grands corpus distants ou très changeants
demandent plutôt `IntentValueQuery` et une vraie stratégie de latence. Il faut
donc qualifier l'architecture de données avant de promettre une date ou un prix.

## 6. Le test requiert une matrice de capacités, pas seulement une matrice OS

Un test macOS 27 ou iOS 27 doit enregistrer matériel Apple Intelligence,
langue, région, compte, autorisations, version Xcode et données de test. Sans
cela, un échec Siri peut être attribué à tort au code client. La preuve
commerciale doit toujours annoncer les conditions vérifiées.

## 7. Deux voies techniques à vendre séparément

Les apps SwiftUI/AppKit natives, les apps cross-platform possédant un target
natif et les apps web-view ne présentent pas le même coût. Le service doit
qualifier cette voie dès l'audit : native, bridge natif, ou non éligible. Cela
évite de vendre une migration à une app qui ne peut pas porter les contrats
Swift nécessaires.

## Implication pour les OpenSpecs

Ajouter aux changements `audit-capability-inventory` et `package-validated-service`
des exigences de score de compatibilité, de classification des données, de
conditions de test et de qualification d'architecture. Traiter les autres
angles comme critères de sélection de pilote dans `prove-macos-siri-journey`
et `prove-ios-siri-journey`.
