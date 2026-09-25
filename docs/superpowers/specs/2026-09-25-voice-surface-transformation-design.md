# Découverte d'objet et d'identifiant, premier jalon de la transformation

Date: 2026-09-25
Status: design, en attente de relecture

## Le problème

Le produit visé prend un dépôt GitHub et un objectif en une phrase, et produit
une branche où l'application parle à Siri et Spotlight, avec une suite de tests et
un jeu de revendications certifiées. Ce produit n'existe pas. Ce qui existe est
un oracle : il génère le code depuis un contrat écrit à la main, lance les tests,
et certifie les revendications. La partie qui exige de comprendre l'application
est entièrement manuelle, et c'est la partie chère.

Cette spec ne couvre pas le produit. Elle couvre le premier jalon de la série
d'implémentation : à partir d'un dépôt et d'une phrase, trouver les objets
candidats et leur identifiant, et le prouver.

## Les quatre décisions prises avec le commanditaire

1. **L'humain valide le choix d'objet, une fois.** Avant que le système ne
   fasse quoi que ce soit d'autre. La découverte peut donc être heuristique et se
   tromper, puisque quelqu'un rattrape.
2. **L'entrée est un objectif en une phrase.** Par exemple « je veux pouvoir dire
   ouvre mon dernier torrent ». Le système en déduit la classe d'objets et
   l'identifiant. Cela guide la découverte sans la guider complètement.
3. **La portée est la classe liste, ouverte en grandissant.** Version un : les
   applications macOS qui ont une vue liste d'objets identifiables. Le moteur est
   conçu pour accueillir d'autres formes, et la version un dit quelles formes
   elle refuse au lieu d'échouer dessus.
4. **La proposition porte sa preuve.** Pour chaque candidat, le motif qui l'a fait
   remonter et le fichier et la ligne où il a été trouvé. C'est ce qui rend la
   validation humaine décidable, et ce qui permet de corriger une règle quand elle
   se trompe.

## Ce que ce jalon ne fait pas

- Il ne trouve pas les coutures. Sélection, suppression, mutation d'événement
  viennent au jalon suivant.
- Il n'écrit aucun code dans l'application hôte. Rien n'est inséré, rien n'est
  ajouté à une cible Xcode.
- Il ne construit pas et ne teste pas. La génération et la vérification existent
  déjà et servent de harnais plus tard, pas dans ce jalon.
- Il ne prétend pas couvrir SwiftUI. La version un refuse cette forme proprement
  et le dit.

## L'architecture

Trois étages, séparés volontairement pour que deux tiers soient testables sans
modèle.

**Les motifs.** Chaque motif est une fonction pure qui prend un dépôt indexé et
retourne des candidats, chacun avec une preuve. Un motif sait une chose, par
exemple « une sous-classe de NSTableView existe et a une source de données ».
Il ne classe rien, il ne hiérarchise rien. C'est ce qui permet de tester un motif
seul, de l'afficher seul, et de le corriger sans toucher aux autres.

**Le score.** Prend la liste plate des candidats et la phrase, et produit les trois
meilleurs avec leur preuve et leur score. Les scores sont lisibles, pas une boîte
noire. Un candidat qui correspond à un mot de la phrase passe devant un candidat
qui ne correspond qu'à une convention. Le score est testable sans modèle, parce
qu'il ne fait qu'ordonner ce que les motifs ont produit.

**La décision.** Prend les trois meilleurs et les fichiers autour, et produit la
proposition finale avec sa justification. C'est le seul étage qui appelle un
modèle, et le seul qui n'est pas testable de façon déterministe. Il n'a pas
besoin de l'être, parce que la validation humaine est la porte, et parce que la
vérification viendra attraper ce qu'il rate.

## Le flux

1. Cloner ou indexer le dépôt.
2. Lancer tous les motifs, en parallèle, chacun isolé.
3. Rassembler les candidats, dédupliquer par classe d'objet.
4. Scorer, garder les trois meilleurs avec leur preuve.
5. L'étage de décision lit ces trois fichiers et rend la proposition.
6. Présenter à l'humain : la classe, l'identifiant proposé, la raison, le
   fichier et la ligne.
7. Après validation, produire le contrat. C'est le début du jalon suivant.

## L'interface

Le jalon s'appelle en ligne de commande, comme le reste du moteur, et rend du
JSON pour que l'étage suivant le consomme et qu'un test puisse l'inspecter. Le
JSON porte le dépôt, la phrase, les candidats avec preuve, la proposition, et un
statut qui dit « dans la classe » ou « forme non gérée » avec la forme en cause.

## Les erreurs

- Un motif qui ne trouve rien est un motif qui ne trouve rien. Il ne lève pas et
  ne devine pas. S'il n'y a aucun candidat, la réponse est « aucun candidat »,
  pas une invention.
- Un dépôt qui n'a pas de cible macOS est un refus de portée, pas un échec
  technique, et la réponse le dit en ces mots.
- Une forme non gérée est un refus de portée. La version un refuse SwiftUI et le
  dit, au lieu de chercher dans le vide.
- L'étage de décision qui ne rend pas de JSON valide fait échouer l'étage, et pas
  la suite avec une proposition inventée.

## Les tests

Ce qui se teste sans modèle, et qui constitue l'essentiel du jalon :

- Chaque motif, seul, sur un dépôt d'appui. Sur les quatre pilotes, le motif
  attendu doit trouver l'objet attendu.
- Un motif qui ne doit rien trouver ne trouve rien. C'est ce qui garantit qu'il ne
  devine pas.
- Le score ordonne correctement deux candidats quand la phrase en désigne un.
- La déduplication garde la meilleure preuve quand deux motifs trouvent la même
  classe.
- L'isolation, sur le dépôt d'appui le plus simple : pas de cible macOS donne un
  refus de portée.

Ce qui ne se teste pas de façon déterministe, et qui est Assumé tel quel :

- L'étage de décision. Il est mesuré sur les quatre pilotes et sur des cas
  volontairement mauvais, où l'on vérifie qu'il choisit mal plutôt que
  qu'il échoue.
- La proposition finale, par le test de bout en bout des quatre pilotes.

## Ce qui décide si ce jalon a réussi

Une commande, sur un dépôt non modifié, avec une phrase, rend une proposition
que l'humain valide du premier coup sur les quatre pilotes. Si la validation
humaine est longue ou incertaine sur l'un d'eux, le jalon a échoué, même si la
proposition est techniquement correcte. C'est le critère, parce que c'est lui
qui correspond au prix d'une heure.

## Le prolongement, non construit ici

Le moteur est conçu pour que les deux étapes suivantes s'y branchent sans le
modifier : la découverte des coutures, puis l'insertion dans la source hôte. Le
registre de motifs existe précisément pour qu'une forme qui n'est pas la vue liste
puisse être ajoutée plus tard, comme un motif qui sait parler d'elle, sans que
les trois étages bougent.
