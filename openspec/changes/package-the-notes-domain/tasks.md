## 1. Precondition de l'environnement

- [x] 1.1 Ajouter les types de faits Apple et un parseur pur pour l'etat de service
      du Siri ameliore, avec des fixtures `granted`, `enqueued`, absent et malforme.
- [x] 1.2 Ajouter les controles de `doctor` qui signalent quand une preuve de
      routage vocal est impossible, et qui disent que le modele on-device disponible
      ne vaut pas routage disponible.
- [x] 1.3 Exposer la verification dans la sortie de `intentlane doctor` et la
      documenter dans le README.

## 2. Modele de donnees des schemas

- [x] 2.1 Ajouter `attributedString` et `file` aux types de parametre de schema.
- [x] 2.2 Donner un type a chaque propriete d'entite de schema, et migrer les
      entrees existantes sans changer leur comportement.
- [x] 2.3 Ajouter la disponibilite Catalyst a une entree de schema et son refus.

## 3. Formes de schema

- [x] 3.1 Distinguer une action qui cree d'une action qui agit sur une cible, et
      corriger le message de refus qui parle de recherche.
- [x] 3.2 Emettre les proprietes d'une entite conforme depuis le schema, avec leur
      type, et l'initialiseur explicite qu'impose `EntityProperty`.
- [x] 3.3 Emettre les `@Parameter` d'une action de creation depuis le schema, et un
      sous-type concret de `public.item` pour un parametre `file`.

## 4. Domaine notes

- [x] 4.1 Ajouter les cinq entrees `notes` avec les parametres exacts du catalogue.
- [x] 4.2 Refuser un `target` sur `createNote`, et refuser une cible inconnue sur
      `appendText` et `updateNote`.
- [x] 4.3 Refuser un schema `notes` sur une app qui declare Catalyst.

## 5. Verification

- [x] 5.1 Fixtures negatives avant chaque changement de generateur.
- [x] 5.2 Un test par forme de schema generee, avec instantane.
- [x] 5.3 Extraire le metadata d'une app reelle conformee au domaine notes, et
      verifier les schemas declares.
- [x] 5.4 `pnpm test`, `pnpm build`, `pnpm validate`,
      `pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check`,
      `node apps/example-macos/verify.mjs`.
- [x] 5.5 Passer la reference des schemas de `R` a `G` pour `notes`, en gardant la
      couche vocale `blocked` dans le ledger de capacite.

## 6. Preuve vocale, hors de ce change

- [ ] 6.1 Reprendre P0-B des qu'un environnement `enhanced-siri` servi existe. Ce
      changement ne produit aucune preuve vocale et ne pretend pas en produire.
