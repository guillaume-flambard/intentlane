# Diagnostic Core Spotlight : échec `SetStoreUpdateService`

Date de recherche : 23 septembre 2026.  
Périmètre : pilote NetNewsWire sur macOS 27.0 (26A428), Xcode 27.0.

## Conclusion

L’erreur observée dans le pilote, `CSIndexErrorDomain -1000` avec la cause
`NSCocoaErrorDomain 4099` et une connexion invalidée à
`com.apple.SetStoreUpdateService`, est l’erreur générique renvoyée par Core
Spotlight quand sa donation est refusée. Le log du service système donne la
cause précise pour ce pilote : il refuse le processus signé comme « not
properly entitled ». Cela se produit **après** l’appel de `indexAppEntities`,
avant qu’un résultat puisse atteindre Spotlight.

La première version du pilote avait aussi un défaut réel : elle conformait
l’entité à `IndexedEntity`, mais ne déclarait pas son titre avec une propriété
`@ComputedProperty(indexingKey: \\.title)`. Cette déclaration est maintenant
générée, compilée et présente dans les métadonnées App Intents du binaire. Le
binaire déclare également le protocole système d’ouverture et le protocole de
recherche dans l’app. Cette correction est nécessaire, mais le service refuse
toujours la donation avant de lire les entités.

La même chaîne d’erreurs a été publiée pour un échantillon Apple sous macOS 27.
Dans ce cas, la résolution confirmée a été de désactiver NordVPN. L’ingénieur
Apple a également demandé d’écarter un réseau bloquant et de joindre un
`sysdiagnose`. C’est l’indice public le plus proche de notre symptôme, mais ce
cas ne prouve pas à lui seul que la cause de ce Mac est un VPN.

Sources : [forum Apple, erreur exacte et résolution VPN](https://developer.apple.com/forums/thread/831263),
[documentation Core Spotlight](https://developer.apple.com/documentation/corespotlight),
[documentation `indexAppEntities`](https://developer.apple.com/documentation/corespotlight/cssearchableindex/indexappentities%28_%3Apriority%3A%29). La définition exacte de `-1000` a aussi été vérifiée dans le SDK local Xcode 27,
`CoreSpotlight.framework/Headers/CSSearchableIndex.h`.

## Ce que les API Apple exigent réellement

| Sujet | Exigence documentée | Décision pour le pilote |
| --- | --- | --- |
| Entité | Conformer l’entité à `IndexedEntity`. | Déjà nécessaire. |
| Donation | Donner les entités avec `CSSearchableIndex.indexAppEntities`. | Conserver ce chemin, ne pas ajouter de double index CSSearchableItem. |
| Index de production | Employer un index **nommé**. Apple réserve `default()` au prototypage et aux tests. | Le pilote et tout template de production doivent utiliser un nom stable, par exemple `NetNewsWire.Articles`. |
| Réindexation | Implémenter `IndexedEntityQuery` quand l’app donne directement des `IndexedEntity`. | Conserver `reindexEntities` et `reindexAllEntities` branchés sur le stockage métier réel. |
| Signature / entitlement | Les articles Apple ne documentent aucune entitlement Core Spotlight ou App Intents qu’une app tierce puisse demander. | Utiliser le bundle d’app signé réel. Ne pas inventer d’entitlement privée ni rendre iCloud/Push obligatoire. |

Sources : [Making app entities available in Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight),
[Adding your app’s content to Spotlight indexes](https://developer.apple.com/documentation/corespotlight/adding-your-app-s-content-to-spotlight-indexes),
[IndexedEntityQuery](https://developer.apple.com/documentation/appintents/indexedentityquery).

L’association d’une App Entity à un `CSSearchableItem` et la donation directe
d’une App Entity sont deux voies alternatives. Apple indique qu’indexer les
deux pour le même contenu crée deux résultats distincts. Le pilote doit donc
garder la donation directe, sauf besoin indépendant d’un ancien résultat
Core Spotlight.

## Diagnostic conseillé, dans cet ordre

1. **Tester hors filtrage réseau.** Désactiver temporairement VPN, relais privé,
   proxy, pare-feu ou filtre DNS/HTTPS tiers, puis réessayer depuis un partage de
   connexion ou un réseau connu non filtré. Reprendre les réglages immédiatement
   après ce test. Sur ce Mac, la vérification initiale a trouvé : pas de service
   VPN configuré, pas de proxy Web/HTTPS, pare-feu macOS désactivé et aucune
   extension système tierce active. Cela n’écarte pas un relais privé ni un
   filtre géré au niveau du compte ou du réseau.
2. **Vérifier le binaire qui donne.** Lancer seulement l’application `.app`
   signée, installée hors du répertoire de build, puis relever son identifiant de
   bundle et ses entitlements avec `codesign`. Ne pas tirer de conclusion depuis
   un test harness ou un exécutable non signé.
3. **Réduire le test.** Avec le même binaire et le même réseau, donner une seule
   entité `IndexedEntity` de titre unique dans un index nommé. Si elle échoue
   avec la même cause `4099`, le raccord métier NetNewsWire est hors de cause.
4. **Réessai contrôlé.** Les appels d’indexation sont asynchrones. En cas
   d’erreur temporaire, journaliser la cause complète et effectuer un nombre
   borné de nouvelles tentatives lors d’un prochain événement métier. Ne jamais
   marquer la donation comme réussie tant que l’appel a levé une erreur.
5. **Escalade Apple.** Si le test minimal échoue sans VPN/filtre, joindre les
   logs horodatés et un `sysdiagnose` à un rapport via Feedback Assistant. Pour
   une autre erreur de donation App Entity, un ingénieur Apple demande
   explicitement ce rapport, sans proposer d’entitlement supplémentaire.

Sources : [cas VPN/réseau et demande de sysdiagnose](https://developer.apple.com/forums/thread/831263),
[réponse Apple demandant Feedback + sysdiagnose](https://developer.apple.com/forums/thread/834780),
[gestion des erreurs Core Spotlight](https://developer.apple.com/documentation/corespotlight/csindex-errors).

## Vérification du 23 septembre 2026

Le pilote a été reconstruit et installé comme application signée avec un index
nommé, les propriétés Spotlight explicites, la réindexation, `OpenIntent` et
`ShowInAppSearchResultsIntent` générés par les schémas système. Les métadonnées
produites par Xcode confirment ces protocoles et la clé `title` indexable.

Le même refus persiste même avec App Sandbox activé, VPN désactivé et partage de
connexion mobile. Le journal non masqué de `SetStoreUpdateService` indique que
le processus tiers signé n’est pas considéré comme suffisamment autorisé. Ce
symptôme est également signalé par d’autres applications tierces et même par
un exemple Apple sur macOS 27. Aucune entitlement publique ne permet de combler
ce refus : ne jamais ajouter une entitlement privée ou contourner la signature
pour tenter de le résoudre.

## Ce qui n’est pas une correction démontrée

- Reconstruire l’index global du disque avec `mdutil` n’est pas présenté par
  Apple comme remède à cette erreur de donation. Après l’essai déjà réalisé, ne
  pas l’interpréter comme une correction de l’intégration.
- Ajouter Push Notifications, iCloud, Application Groups, ou une entitlement
  App Intents non documentée ne corrige pas un `SetStoreUpdateService` invalidé
  et augmenterait inutilement la surface de sécurité.
- Un résultat dans Spotlight ou Siri ne peut pas être marqué `pass` tant que la
  donation retourne `-1000/4099`, même si la compilation et la signature sont
  valides.

## Critère de sortie du blocage

Le blocage est levé seulement lorsqu’un build signé donne l’entité Alpha dans
un index nommé sans erreur, que `Cmd` + `Espace` renvoie un résultat attribué à
NetNewsWire avec son icône, et que ce résultat ouvre l’article Alpha exact.
Jusque-là, le ledger Spotlight/Siri doit rester `fail` et préciser :
`macOS 27.0 (26A428), locale active, cause -1000/4099, réseau testé`.
