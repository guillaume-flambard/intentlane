# M3: The audit deliverable

## 1. Rouge: le rendu a son contrat avant d'exister

- [x] 1.1 Un rapport portant un seul finding rend un livrable qui nomme la
      capability, l'état et le chemin de preuve, et le rendu est une fonction
      pure du rapport déjà analysé. Vérifié par un test qui échoue parce que le
      module n'existe pas encore.
- [x] 1.2 Le même rapport rendu deux fois donne deux rendus identiques octet
      pour octet. Vérifié par un test.
- [x] 1.3 Chaque nombre du livrable est celui du rapport: score, points,
      maximum, band, et le compte de findings par état. Vérifié par un test qui
      compare aux valeurs du rapport, y compris sur un rapport dont le score est
      inhabituel, pour que la comparaison ne passe pas par hasard.
- [x] 1.4 Un rapport portant tous les blocs optionnels (route, data,
      architecture, conditions, quality, catalogue, targets, overlay) rend
      chacun d'eux, pour qu'un bloc ajouté au rapport ne puisse pas disparaître
      du document. Vérifié par un test.
- [x] 1.5 Deux plateformes auditées donnent deux sections distinctes, et aucune
      affirmation sur une plateforme qui n'a pas été auditée. Vérifié par un
      test.
- [x] 1.6 Un finding Shortcuts seul est rendu comme un support Shortcuts, sans
      formulation Siri ni Apple Intelligence. Vérifié par un test.
- [x] 1.7 Un finding `unknown` est rendu comme indécis, jamais comme non supporté
      ni comme implémenté, et une capability absente du rapport n'est pas
      nommée du tout. Vérifié par un test.
- [x] 1.8 La section humaine est présente et vide, et le livrable énonce ses
      limites: audit en lecture seule et local, absence rapportée comme
      `unknown` et non `missing`, comportement Siri non observé par l'audit.
      Vérifié par un test qui affirme que la section existe et ne contient aucun
      finding.
- [x] 1.9 Un fichier qui n'est pas du JSON valide sort en non-zéro, nomme le
      fichier, et n'écrit aucun livrable. Vérifié par un test de la commande.
- [ ] 1.10 La fenêtre affiche le texte que le moteur a rendu, caractère pour
      caractère, et ne le recompose pas. Vérifié par un test qui compare le
      texte affiché au fichier que la commande écrit pour le même rapport.
- [ ] 1.11 Demandé sans livrable, la fenêtre déclare qu'il n'y en a pas encore
      et n'affiche aucun document. Vérifié par un test.
- [ ] 1.12 Un moteur qui échoue ou rend un rapport illisible fait apparaître la
      raison dans la fenêtre, et aucun document. Vérifié par un test.

## 2. Vert

- [ ] 2.1 Déplacer la dérivation des groupes dans core et faire importer
      `capability-map.ts` de studio-protocol, pour qu'une seule liste des dix
      groupes existe dans le dépôt. Vérifié par le test de M2 qui passe sans
      modification, et par une recherche qui ne trouve qu'une liste.
- [ ] 2.2 Implémenter le rendu dans core, en fonction pure de rapports déjà
      analysés, sans lecture de fichier. Vérifié par tous les tests du groupe 1,
      qui deviennent verts.
- [ ] 2.3 Câbler `intentlane deliverable <rapport.json> [--out <fichier>]`,
      qui lit le rapport, rend le livrable, écrit le fichier si `--out` est
      donné, et écrit sur stdout sinon. Vérifié par le test de 1.9 et par une
      exécution sur le rapport réel.
- [ ] 2.4 Ajouter l'étape Deliverable au shell: le lecteur qui demande le
      livrable au moteur, l'état qui le tient comme texte, et l'écran qui
      l'affiche avec un contrôle d'enregistrement. Le texte n'est jamais formaté
      par la fenêtre. Vérifié par les tests de 1.10, 1.11 et 1.12.

## 3. Run réel

- [ ] 3.1 Rendre le rapport FSNotes réel et le lire comme le ferait un client:
      51 findings, le score que le rapport porte, dix groupes, et rien
      d'inventé. Vérifié par le fichier livré, lu.
- [ ] 3.2 `pnpm test`, `pnpm build` et `pnpm validate` verts, et
      `openspec validate --changes --strict` propre. Vérifié par les sorties
      des commandes.
- [ ] 3.3 Le README documente la commande dans sa section CLI, et
      `docs/spec/AUDITOR-SPEC.md` reste inchangé, puisque le contrat de la
      commande `audit` n'a pas bougé. Vérifié par une recherche dans
      AUDITOR-SPEC qui ne trouve aucun format ajouté, et par le README qui
      liste la commande.
- [ ] 3.4 L'écran Deliverable est dessiné à partir du rapport FSNotes réel, à
      chaque taille et dans les deux apparences, et n'est pas vide. Vérifié par
      le harnais de rendu, comme les autres écrans du shell.
- [ ] 3.5 `swift test` dans `apps/studio` vert, avec le nombre de tests
      consigné. Vérifié par la sortie de la commande.
