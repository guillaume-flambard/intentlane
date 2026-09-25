# Comment on a mesuré, et ce que ça autorise

## Ce qu'on a mis en face

Les deux sources de modèle ont reçu le même corpus et les mêmes questions, et elles ont réussi et
échoué à des endroits opposés.

### Apple Foundation Models, sur l'appareil

`SystemLanguageModel.default`, disponible, 24 langues dont `fr-FR` et `fr-CA`, plafond de contexte
mesuré à 8192 jetons.

- Une demande d'entreprise inoffensive, une synthèse d'une ligne sur le retard d'un projet avec un
  dépassement de douze pour cent, a été refusée 5 fois sur 5, en formel comme en familier, avec ou
  sans chiffre, avec ou sans rapport. Une note personnelle anodine a été acceptée.
- Le résumé d'un mot de passe root a rendu `1234`. Le rappel d'un mot de passe de production a
  rendu `Prodpass2024`. Une demande de note de contact a rendu un nom, une adresse, un téléphone et
  un courriel.
- Par paires minimales, « retard du projet » est refusé dans tous les cadrages, alors que
  « croissance du projet plus un coût de douze pour cent » passe. Le filtre se déclenche sur le
  cadrage négatif, pas sur le registre de langue.
- Latence 4,9 s à froid, 1,2 s à chaud.

Un modèle génératif rend ce qu'on lui donne. Il ne peut pas tenir le rôle d'une porte. Comme il
tourne sur l'appareil, rien ne sort, mais un secret qui lui est confié se retrouve recopié dans la
sortie générée et dans ce qui est persisté, et c'est là que l'exposition est réelle.

### Jev, TypeSafe

`POST https://api.typesafe.ai/v1/systemone`, modèle résolu `jev-1.13.0`. Ce n'est pas un modèle
génératif : il prend un `state` et des questions typées, et rend des réponses typées constraintes
à l'espace d'options que l'appelant fournit, avec probabilités et confiance. Deux appels vivants,
22 questions au total, HTTP 200 dans les deux cas.

- Cadrage détection, « contient-il un mot de passe, un code PIN ou un code d'accès » : mot de passe
  de premier plan 0,99, mot de passe d'un tiers 0,97, code PIN 0,99, mot de passe écrit en
  lettres séparées par des tirets 0,86, numéro de téléphone 0,07, code promo public 0,13. Six sur
  six, aucun faux positif.
- Cadrage jugement, « cette note peut-elle être montrée en entier à un collègue » : téléphone
  0,58, code promo 0,79, mot de passe masqué 0,16, code PIN 0,03. La confiance est graduée sous une
  question de jugement et bimodale sous une question de détection. Le dégradé est une propriété de
  la question posée, pas du modèle. Un premier test l'avait manqué parce qu'il posait une question
  de détection et attendait un dégradé.
- Les questions qui ont une réponse défendable sont revenues entre 0,97 et 1,0. Un vrai jugement de
  valeur est revenu à 0,26 avec un 0,5 / 0,5 entre tout bloquer et prévenir puis masquer.
- Latence 0,66 s pour 8 questions, 0,59 s pour 14, soit environ 82 ms par question amorti.
  2637 jetons en entrée et 534 en sortie sur les deux appels.
- Sa sortie est contrainte aux options fournies, donc il n'a aucun mécanisme pour restituer un
  secret. C'est structurel, ce n'est pas le résultat d'un filtre.

Les chiffres du fournisseur, 193 fois plus rapide et 444 fois moins cher, restent non vérifiés. Le
latent par question est cohérent avec notre mesure, le latent par requête ne l'est pas, et aucune
grille tarifaire n'a été confrontée au compte.

## Ce qu'on en déduit pour IntentLane

Trois choses, dans cet ordre.

**Le `blocked` d'IntentLane a une base mesurée.** Une confiance qui s'effondre sur un jugement de
valeur est la définition opérationnelle de « on ne peut pas revendiquer cette preuve ». Ce n'est
pas une convention de rédaction, c'est une lecture de distribution.

**L'argmax seul est un mauvais produit.** Le cas mesuré le montre : 0,5 contre 0,5 sur « faut-il
bloquer la note d'un utilisateur qui écrit son propre mot de passe bancaire dans son propre
gestionnaire ». L'argmax dit tout bloquer, la confiance dit que personne ne sait. Prendre l'argmax
et publier un `pass` ou un `blocked` fort sur cette base, c'est inventer une certitude.

**Le cloud ne peut pas être une dépendance.** Le cœur déterministe d'IntentLane est reproductible
et sans réseau, et c'est ce qui le rend crédible. Rendre la porte distante obligatoire casserait
cette propriété pour gagner un peu de finesse de verdict. Elle reste donc optionnelle, et son
absence produit `blocked`, jamais un routage silencieux vers une autre source.

## Ce que cette porte ne fait pas

Jev renvoie une probabilité, pas un intervalle. Il dit « il y a un secret à 0,99 », il ne dit pas
où. Il peut bloquer, il ne peut pas redacter. La localisation des passages sensibles reste notre
code déterministe, et c'est la partie porteuse de la chaîne, celle qui demande le plus de tests.

## Ce qui reste ouvert

La validation sur de vraies notes utilisateur n'a pas eu lieu et n'est pas bloquante pour cette
décision. Elle demande que l'application existe et produise son propre corpus sur la machine, en
place, avec accord note par note. D'ici là, les mesures reposent sur 22 questions et un corpus
écrit de notre main, et il est écrit ici plutôt que présenté comme une validation.
