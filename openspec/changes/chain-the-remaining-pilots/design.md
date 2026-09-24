## Context

Voir `proposal.md` pour la motivation. Ce qui contraint la mise en oeuvre est
état actuel, pas intention.

Deux pilotes sont certifiés : FSNotes sur une cible Swift 229 fichiers, HandBrake
sur une cible Objective-C 77 fichiers. Tous deux ont une structure en quatre
fichiers, dont un seul parle a l'application, et ce fichier la est exclus de toute
compilation de test. Les six revendications déterministes sont identiques pour les
deux.

Trois candidats qualifiés restent : Transmission, LuLu, tous deux Objective-C, et
Cyberduck, un shell natif au-dessus d'une application Java. Ils sont clonés dans
`~/projects/active/apps/clients/intentlane-candidates`, avec les révisions figées.

Une revue de branche a produit une liste de constats, dont trois sont des
défauts de code et non des tâches de vente : la couture qui lit l'application
n'était pas liée au main actor dans les deux forks, la certification des
métadonnées acceptait n'importe quel objet JSON, et la suppression d'index n'était
câblée nulle part alors que la commande de test ne l'exerce pas. Les deux
premiers sont corrigés. Le troisième ne l'est pas, et c'est le premier chantier de
ce changement.

Le test d'index des deux pilotes s'exécute sans l'application, donc il ne peut pas
exercer le chemin de suppression de l'application. C'est une contrainte de la
découpe, pas un oubli : la couper est ce qui rend les règles testables sans
l'application. Exercer la suppression demandera soit un second harness qui lie
l'application, soit une sonde, et ce choix a un coût.

Le dépôt produit est public et la plage de commits contient du material commercial.
Rien n'est poussé, et l'authentification npm échoue en 401. Ces deux points ne
sont pas des tâches de ce changement.

## Goals / Non-Goals

**Goals:**

- Donner à chaque pilote restant une condition d'entrée écrite, et un ordre, de
  sorte que l'enchainement ne soit pas une décision prise trois fois.
- Fermer l'écart entre ce que `indexSync` certifie et ce que l'application fait, et
  le prouver par un test qui exerce le chemin réel quand c'est possible.
- Ajouter une commande de sonde qui prouve que le processus lancé s'enregistre,
  ce que la compilation ne prouve pas.
- Écrire la porte de l'offre et la clôture avant de les atteindre, pour que le
  prix soit dérivé des mesures et que les limites soient publiées.
- Réutiliser ce que les deux pilotes ont appris sans le recopier : la recette
  porte la règle, les specs portent l'exigence, les registres portent la mesure.

**Non-Goals:**

- Pousser les branches ou publier sur npm, qui restent des décisions de la
  personne.
- Contacter un mainteneur ou envoyer une PR. Les brouillons pourront etre
  préparés, pas envoyés.
- Revenir sur la méthode des deux pilotes certifiés autrement que pour les
  défauts trouvés par la revue. Leur certification ne change pas.
- Écrire la recette version 2 avant le dernier pilote, parce qu'elle doit porter ce
  que les cinq ont appris.
- Rendre la réindexation incrémentale obligatoire. C'est un choix de pilote, pas
  une exigence.

## Decisions

### Corriger les défauts sur les deux pilotes avant d'enchainer

Un défaut trouvé sur une stack et laissé en place sera redécouvert sur les trois
prochaines, à chaque fois plus cher à diagnostiquer parce qu'il cohabite avec de
nouveaux codes. La correction se fait sur les deux pilotes existants, ce qui donne
en plus la preuve que la règle vaut pour deux stacks.

Alternative écartée : corriger au fil de l'eau, pilote par pilote. Moins de travail
par commit, mais chaque pilote suivant démarre avec un état connu et incomplet, et
la feuille d'effort attribue alors le temps de correction à la mauvaise étape.

### Le main actor par défaut, la sortie par décision enregistrée

La couture qui lit l'application est liée au main actor sur les deux stacks, parce
que les deux modèles d'objet sont mutés par l'interface. Une application dont
l'état serait réellement isolé pourrait s'en dispenser, mais la sortie se
décide et s'enregistre, parce que l'erreur coûte un crash dans l'application de
quelqu'un d'autre.

Alternative écartée : detecting à l'exécution si l'appel vient du main thread. Une
vérification runtime coûte à chaque lecture et échoue au pire moment. Le
compilateur est le bon endroit.

### Exercer la suppression d'index par un harness qui lie l'application

Le test d'index actuel ne lie pas l'application, donc il ne peut pas prouver que la
suppression est câblée. Un second harness, qui lie le chemin de suppression de
l'application et intercepte l'index nommé, prouverait le câblage sans lancer
l'interface. C'est plus cher que le harness actuel et c'est la seule voie qui
transforme une affirmation en test.

Si l'application n'expose aucun événement de suppression, il n'y a rien à
exercer, et le pilote décrit alors la réindexation à la demande du système au lieu
de prétendre à un crochet. Cette bifurcation est inscrite dans la spec, pas
décidée au moment de l'écriture du test.

Alternative écartée : déclarer `indexSync` vérifié sur la seule foi du cycle de
vie de l'API. C'est exactement l'écart que la campagne a pour objectif de supprimer,
et le reproduire ici décrédibiliserait la revendication partout ailleurs.

### La sonde est une commande, pas un script qu'un humain lit

La sonde lance l'application construite dans une session graphique, attend le
signal d'enregistrement et sort avec un code. Elle est réutilisable depuis le
manifeste comme les autres portes, donc elle entre dans le jeu de revendications
de la même façon qu'une suite de tests.

Le pilote IINA possède déjà une sonde. La réutiliser est une déviation, parce que
les deux applications ne s'enregistrent pas de la même façon et que la différence
est précisément l'information.

### Les trois pilotes dans l'ordre qui va du proche au risqué

Transmission, puis LuLu, puis Cyberduck. Transmission teste si le coût mesuré chez
HandBrake était général à la stack. LuLu ajoute un cas de sensibilité. Cyberduck
est le shell Java, la seule stack où la méthode peut ne pas s'appliquer, donc il
vient en dernier et son résultat est publié dans les deux sens.

La porte exige trois domaines distincts. FSNotes est un carnet de notes, HandBrake
un transcodeur, ce sont deux domaines. Transmission et LuLu restent à mesurer
avant d'affirmer qu'elles ajoutent deux domaines et non deux applications du même
domaine.

### Les conditions d'entrée sont écrites, pas senties

Chaque pilote reçoit ses conditions avant de commencer : l'application compile
depuis un clone propre, le précédent est certifié, et aucun défaut connu du
précédent n'est non corrigé. Un pilote qui ne les remplit pas est bloqué et nommé.
C'est plus strict que l'usage, et c'est la seule façon que l'ordre tienne quand un
pilote est plus difficile que prévu.

## Risks / Trade-offs

- **Le second harness d'index est le poste le plus cher de ce changement.** Il
  touche deux applications et n'est nécessaire que si elles exposent un
  événement. Le premier pilote qui n'en expose pas montre le plancher du coût
  réel, et la feuille d'effort le mesurera.
- **La sonde dépend d'une session graphique**, ce qui la rend non exécutable en
  environnement continu. Elle reste une commande, donc vérifiable par une
  personne, mais elle sort du chemin vert par défaut et ne prétend pas le
  contraire.
- **LuLu est une application de sécurité** et ses objets peuvent porter des noms
  écrits par la personne. La classification de sensibilité précède le contrat,
  donc un ajustement du contrat est probable, et c'est prévu.
- **Cyberduck peut ne pas s'appliquer du tout.** C'est le but de le garder en
  dernier : le découvrir au troisième pilote coûterait un changement de méthode en
  cours de route, le découvrir au cinquième ne coûte qu'un résultat publié.
- **Un commit par défaut du main actor ralentit chaque pilote** d'une étape,
  celle où la couture est écrite. C'est un coût constant et volontaire, et il est
  dans la recette pour que les pilotes suivants l'héritent sans le découvrir.
