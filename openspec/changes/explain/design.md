# ADR de conception: explain n'invente pas ce qu'il ne sait pas

## La contrainte qui a decide de la forme

`explain` ne doit pas introduire de taxonomie propre, et il consomme ce qui existe. Ce qui
existe a ete verifie avant d'ecrire une ligne : le catalogue donne `id`, `group`,
`surface`, `availability`, `companions`, `evidence`, `claim` et `security`. Les
revendications donnent `title`, `verifiedBy`, `evidence` et `requires`. Il n'y a **ni prose
ni lien Apple** dans le code, et les messages des codes diagnostiques sont des litteraux
dans les sources, pas un registre.

Donc deux des sections demandees ne peuvent pas etre remplies honnêtement. Plutot que de
les inventer, `explain` y ecrit que l'information n'est pas enregistree et nomme le fichier
qu'un humain doit lire. C'est la meme discipline que le `typeIdentifier` du harnais : une
reference fabriquee est pire qu'une reference absente, parce qu'elle a l'air fiable.

## Ce que explain ne fait pas

Il ne derive aucun verdict. Il affiche l'etat que la derivation a produit quand on lui en
donne un, et dit explicitement qu'aucune verification n'a eu lieu ou que la revendication
n'appartient pas au pilote lu, parce que ces deux situations se ressemblent dans la sortie
et ne doivent pas etre confondues.

Il ne devine pas quelle couche un humain remplit. Une revendication observee exige des
couches hors de la paire globale, mais rien dans le depot ne dit laquelle de ces couches
correspond a l'observation. La premiere version affirmait `a person fills metadata, query,
spotlight`, ce qui etait faux pour une revendication deterministe et non source pour une
revendication observee. La ligne a ete retiree plutot que corrigee, parce que la corriger
exigerait une donnee qui n'existe pas.

## La decouverte que explain a faite

En affichant une capability, `explain` a imprime `available on macOS 15.0, iOS 18.0` pour
`AppIntentsTesting`. L'interface Swift livree avec Xcode 27 declare 36 fois `macOS 27.0`
et zero fois `15.0`. L'entree du catalogue avait recope la valeur de `proof.confirmation`,
juste au-dessus.

L'impact n'est pas cosmetique : `availableOn` alimente la comparaison `sdkTooOld`, donc un
projet declarant un socle macOS 15 n'etait pas averti que le framework exige 27. C'est un
faux negatif de l'auditeur, exactement la classe de defaut que ce projet existe pour
attraper. La valeur est corrigee a 27.0 et un test la fixe, en citant le framework livre
comme autorite.

## Limite assumee

Renseigner les liens Apple et la prose demanderait d'ajouter du contenu au catalogue. Ce
serait du contenu, pas une taxonomie, mais c'est une decision editoriale et elle n'est pas
prise ici. Tant qu'elle ne l'est pas, `explain` avoue son manque, ce qui est utile.
