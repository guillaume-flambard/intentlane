# Vérification automatisée IntentLane

## Promesse réaliste

IntentLane peut rendre l'intégration répétable et non dépendante de Guillaume :
contrat, génération, compilation, métadonnées App Intents et tests métier
peuvent être lancés dans une commande de CI. Il ne peut pas honnêtement simuler
ou certifier à lui seul l'interface conversationnelle propriétaire de Siri :
Apple ne fournit pas d'API publique qui permette de piloter puis lire chaque
écran Siri dans un test de production.

Le produit sépare donc les deux preuves au lieu de donner un faux « 100 % » :

| Niveau | Vérifié automatiquement | Preuve attendue |
| --- | --- | --- |
| Contrat | oui | YAML valide et compatible avec le SDK déclaré |
| Génération | oui | fichiers générés frais et déterministes |
| Adaptateur métier | oui, par les tests de l'app cliente | résolution exacte, droits, navigation et cas négatifs |
| Métadonnées Apple | oui | `Metadata.appintents/extract.actionsdata` issu du build |
| Surface Siri / Spotlight | non totalement | protocole visible, puis reproduction indépendante, consigné dans le ledger |

Une build verte sans les deux dernières lignes n'est pas une promesse
commerciale. Elle est seulement prête à être soumise au test système.

## Commande unique par application

Après le premier raccord du client, la CI appelle :

```sh
intentlane verify \
  --config intentlane.yaml \
  --output Mac/IntentLaneGenerated \
  --app-test "xcodebuild -project Client.xcodeproj -scheme Client -destination 'platform=macOS' test" \
  --metadata build/Build/Products/Debug/Client.app/Metadata.appintents \
  --ledger PILOT-CLIENT-LEDGER.yaml \
  --strict
```

La commande affiche chaque porte séparément : `contract`, `generated`,
`applicationTests`, `metadata`, `liveEvidence`. Elle échoue :

- sans test applicatif déclaré ;
- si la génération est périmée ou modifiée ;
- si le build ne produit pas de métadonnées App Intents lisibles ;
- en `--strict`, tant que le ledger ne dit pas `verified`.

Le `--app-test` appartient à l'app cliente. Il est le point où son équipe
prouve son mapping métier, jamais un script que IntentLane devine. Pour une
application native, cette commande est normalement un `xcodebuild test` ;
pour une app Expo ou React Native, elle peut être un script qui prébuild puis
exécute les tests iOS/macOS.

## Contrat de tests à fournir par le client

Pour chaque objet rendu trouvable et ouvrable, le test applicatif doit prouver
au minimum :

1. l'ID stable résout exactement le bon objet ;
2. une recherche renvoie les candidats autorisés, dans un ordre explicable ;
3. un titre absent renvoie zéro résultat, sans approximation ;
4. un objet non autorisé n'est ni suggéré ni ouvert ;
5. l'ouverture passe par le routeur réel de l'app et sélectionne l'ID exact ;
6. une création, écriture ou suppression vérifie droits, confirmation,
   authentification et effet final ;
7. create, update, delete et retrait d'accès entraînent une réindexation.

IntentLane génère l'interface de l'adaptateur. Le client implémente ce seul
mapping, et les tests ci-dessus deviennent son filet de sécurité durable.

## Intégration plug-and-play, ce qu'elle signifie

Un lancement réellement reproductible suit ce chemin :

1. `intentlane audit` classe la cible, ses plateformes et ses bloqueurs sans
   l'écrire.
2. Le consultant sélectionne un objet et une capacité dans le catalogue Apple.
3. `intentlane init` puis `intentlane generate --adapter-output ...` créent le
   contrat et le squelette de raccord.
4. L'équipe de l'app complète l'adaptateur et son test métier une fois.
5. La CI lance `intentlane verify --strict` à chaque changement.
6. Une preuve Siri/Spotlight est rejouée par deux personnes lorsqu'une version
   doit être annoncée ou livrée, et alimente le ledger.

Ce qui est automatique est la chaîne de vérification. Ce qui reste propre à
chaque client est légitime : ses données, ses droits et sa navigation. Une
outil qui prétendrait les déduire automatiquement pourrait ouvrir le mauvais
objet ou exposer une donnée privée.

## NetNewsWire

Le pilote NetNewsWire reste le test de référence actuel. Son plan
AppIntentsTesting fournit la partie `--app-test`; le bundle de résultat et les
métadonnées du build alimentent les portes automatiques. Les parcours visibles
restent documentés dans [MANUAL-SIRI-ACCEPTANCE.md](MANUAL-SIRI-ACCEPTANCE.md)
et le ledger ne peut passer à `verified` sans une seconde reproduction.
