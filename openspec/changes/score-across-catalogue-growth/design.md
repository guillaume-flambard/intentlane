## Context

`scoreAuditReport` est une fonction pure des findings. Elle produit un score sur
100, une bande, des points, un maximum, un nombre d'`applicable`, des comptes par
état et une découverte Siri. Les points par état sont :

| état | points |
|---|---|
| `tested` | 3 |
| `implemented` | 2 |
| `detected` | 1 |
| `feasible` | 1 |
| `unknown` | 0 |
| `unsupported` | 0, et non applicable |

`applicable` vaut le nombre de findings dont l'état n'est pas `unsupported`, et
`maximum = applicable * 3`. Le score est donc le rapport des points obtenus sur
le nombre de records applicables, où un record que le projet n'a pas obtenu coûte
sa part du dénominateur.

C'est défendable : un catalogue décrit ce qu'une app devrait avoir, et une app
qui n'a pas une capability en manque. Mais le dénominateur est le catalogue, donc
le score n'est pas une propriété du projet. Il est une propriété du couple
projet, catalogue.

## Goals / Non-Goals

**Goals:** que la sémantique du score soit écrite quelque part, que la question de
`unknown` soit tranchée explicitement, et qu'un client puisse lire pourquoi un
score a bougé.

**Non-Goals:** ne pas redéfinir les bandes, qui sont stables et que le client
reconnaît. Ne pas introduire de pondération par groupe : la lecture par groupe
est un affichage, pas un poids. Ne pas changer le format de rapport tant que la
décision n'est pas prise.

## Decisions

- **Un score se lit « contre le catalogue X ».** Le catalogue est le dénominateur,
  donc `catalogueVersion` accompagne le score. Déjà implémenté par `3dfdba8`, et
  c'est ce qui rend tout le reste discutable au lieu d'être subi.

- **La lecture par groupe est un affichage, pas un rescoring.** `byGroup` dérive
  du record du catalogue, jamais d'un découpage de l'identifiant, donc un
  identifiant qu'aucun record ne possède est laissé de côté au lieu de recevoir
  un groupe inventé. Le score global reste identique.

- **`unknown` reste la question ouverte, et c'est la seule.** Trois options, avec
  leur coût réel :

  1. **Accepter le score relatif au catalogue et vendre la lecture par groupe.**
     Déjà implémenté. Le client voit « 2 au global, 13 sur les fondations, 0 sur
     27 points de Foundation Models parce qu'il n'en utilise aucun ». Le nombre
     bouge quand le catalogue grandit, et le rapport le dit.

  2. **Faire que `unknown` ne coûte plus.** Compter comme applicable seulement ce
     dont l'auditeur a des éléments. Un `unknown` devient gratuit, donc une
     application qui n'utilise rien de Foundation Models n'est plus pénalisée
     pour cela. Le prix : tous les chiffres existants changent, y compris ceux
     d'un audit déjà livré, et le score flatte dès qu'un auditeur n'a pas encore
     de signature pour une capability. Un score qui monte quand l'outil sait
     moins de choses est un score qu'on ne peut pas défendre devant un client.

  3. **Ne garder ni le score global ni sa lecture, et vendre le groupe.** Un
     rapport par groupe sans total. Ce qui est vrai, et qui supprime le problème,
     au prix d'un chiffre unique que le client attend.

- **Recommandation : l'option 1.** Elle est en place, elle ne change aucun
  nombre, et elle transforme la seule objection previsible, « mon score a baissé
  alors que je n'ai rien changé », en une réponse que le rapport contient déjà.
  L'option 2 est la seule qui rend le score comparable dans le temps, et elle
  doit être rejetée ou adoptée en connaissance de ce qu'elle fait dire d'un
  audit : elle récompense l'ignorance de l'outil.

- **Les tasks 2.x et 3.x dépendent de ce change.** Elles ajoutent des records, donc
  elles ajoutent du dénominateur. Les écrire avant la décision, c'est figer le
  problème dans deux cents records de plus.

## Risks / Trade-offs

- Un score relatif au catalogue reste un chiffre qui bouge sans que le projet
  bouge. La parade est la version du catalogue et la lecture par groupe, pas une
  promesse de stabilité.
- La lecture par groupe ajoute des lignes au rapport. Un rapport client long est
  un rapport que personne ne lit, donc la présentation texte doit garder le total
  en tête et le détail en dessous.
- Si l'option 2 est retenue, les audits déjà livrés deviennent non comparables
  aux nouveaux. C'est un coût commercial, pas technique, et il doit être dit
  avant la décision, pas après.
