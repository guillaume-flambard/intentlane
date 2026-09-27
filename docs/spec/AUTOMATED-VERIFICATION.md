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

## Une commande par application, après le premier raccord

La certification porte sur un **ensemble de revendications déclaré**, et chaque
revendication nomme ce qui la settles. `intentlane claims` affiche le catalogue.

```sh
# ce que le client peut revendiquer, et ce qui le prouve
intentlane claims

# certifier l'ensemble déclaré par le manifeste du pilote
intentlane verify --pilot pilots/iina/pilot.yaml
```

Un manifeste `intentlane-pilot/1.0` déclare l'ensemble de revendications, les
chemins du contrat et des métadonnées, et la commande qui settles chaque porte
détenue par l'application. Ses chemins et ses commandes se résolvent depuis son
propre dossier, donc il est autonome.

Deux familles de revendications, et la distinction est le cœur du modèle :

- **déterministe**, réglée par une commande qui sort avec un statut :
  `contract`, `generated`, `applicationTests`, `integrationTests`, `metadata`,
  `indexSync`, `registration` ;
- **observée**, qu'aucune API publique ne peut trancher : `siri-conversation`,
  `spotlight-ui-result`. Le ledger les settles, et il n'est lu que si une
  revendication observée est revendiquée.

Le résultat nomme **chaque** revendication et sa famille, puis écrit
`Any claim not listed here is not certified`. Un `certified` ne peut donc jamais
être lu seul comme « la surface système fonctionne ».

```
pass  contract [deterministic]: verified
pass  generated [deterministic]: verified
pass  applicationTests [deterministic]: verified
pass  integrationTests [deterministic]: verified
pass  metadata [deterministic]: verified
pass  indexSync [deterministic]: verified
certified: Certified for the declared claims only: contract, generated,
applicationTests, integrationTests, metadata, indexSync.
Any claim not listed here is not certified.
```

`--strict` sort non nul tant qu'une revendication de l'ensemble n'est pas
certifiée. Ajouter une revendication observée la fait attendre une personne :

```sh
intentlane verify --pilot pilots/iina/pilot.yaml --claim siri-conversation
# pending  siri-conversation [observed]: pending
# pending-evidence: ... until then they are simply not certified.
```

## Une revendication contestée, et ce que `contested` veut dire

Une revendication déterministe ne devient `verified` que si **deux** choses
tiennent à la fois : la commande a rendu `pass`, et une confiance a atteint le
seuil de `0,8`. Le verdict est **dérivé**, jamais fourni : une source ne peut
pas écrire `verified` dans le résultat, parce que la fonction de dérivation ne
lit aucun verdict en entrée, seulement des preuves.

Quand la commande passe mais que la confiance est sous le seuil, la
revendication sort `contested`, et elle porte la distribution qui l'a produit.
`contested` ne veut donc pas dire « la commande a échoué » : une commande qui
échoue ou qui ne dit rien donne `failed` ou `missing`. `contested` veut dire
**la commande a dit oui et la preuve ne tient pas debout**.

```sh
# contested  contract [deterministic]: contested
# blocked: Contested claim(s), whose evidence cleared no threshold ...
```

C'est le cas mesuré le plus parlant. Demandé quoi faire du mot de passe
bancaire d'un utilisateur, écrit par lui dans son propre gestionnaire, un
classifieur contraint répond à 0,26 avec une distribution 0,5 / 0,5 entre « tout
bloquer » et « prévenir puis masquer ». L'argmax seul aurait dit « tout
bloquer », avec une assurance fausse. Le seuil existe pour que ce cas sorte
`contested` et remonte à une personne, et c'est pourquoi l'argmax seul est
interdit : une préférence forte n'est pas une certitude.

Par défaut, la confiance vient de la source locale `local-deterministic`, qui ne
fait aucun appel réseau et rend une confiance de `1` dans les deux sens, donc le
`certified` ci-dessus reste reproductible hors ligne. Une source qui ne produit
**aucune** valeur ne se replie pas sur la source locale : la revendication sort
`contested` et le dit, parce qu'une repli silencieux vers une porte plus faible
serait exactement le mensonge que ce mécanisme existe pour empêcher.

**Rupture de sens assumée.** Avant, `--strict` exigeait la preuve humaine. Cette
garantie existe toujours, à la demande :
`--claim siri-conversation --claim spotlight-ui-result`. Un projet qui ne
revendique aucune observation n'a plus rien à prouver à une personne, et une
revendication inconnue est refusée plutôt que silencieusement ignorée.

## Ce que la certification automatique ne peut pas établir

Rien n'a été automatisé qui ne l'était pas. Un build vert, des métadonnées
lisibles et un harnais d'intégration prouvent le code du client, pas la
conversation système. L'absence d'API publique pour envoyer une phrase à Siri et
pour relire un index Core Spotlight nommé reste un plancher physique, et c'est
pourquoi ces deux éléments sont des revendications observées et non des portes.


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
restent documentés dans [MANUAL-SIRI-ACCEPTANCE.md](../pilots/MANUAL-SIRI-ACCEPTANCE.md)
et le ledger ne peut passer à `verified` sans une seconde reproduction.
