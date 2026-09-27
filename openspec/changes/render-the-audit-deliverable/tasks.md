# M3: The audit deliverable

## 1. Rouge: le rendu a son contrat avant d'exister

- [ ] 1.1 Un rapport portant un seul finding rend un livrable qui nomme la
      capability, l'état et le chemin de preuve, et le rendu est une fonction
      pure du rapport déjà analysé. Vérifié par un test qui échoue parce que le
      module n'existe pas encore.
- [ ] 1.2 Le même rapport rendu deux fois donne deux rendus identiques octet
      pour octet. Vérifié par un test.
- [ ] 1.3 Chaque nombre du livrable est celui du rapport: score, points,
      maximum, band, et le compte de findings par état. Vérifié par un test qui
      compare aux valeurs du rapport, y compris sur un rapport dont le score est
      inhabituel, pour que la comparaison ne passe pas par hasard.
- [ ] 1.4 Un rapport portant tous les blocs optionnels (route, data,
      architecture, conditions, quality, catalogue, targets, overlay) rend
      chacun d'eux, pour qu'un bloc ajouté au rapport ne puisse pas disparaître
      du document. Vérifié par un test.
- [ ] 1.5 Deux plateformes auditées donnent deux sections distinctes, et aucune
      affirmation sur une plateforme qui n'a pas été auditée. Vérifié par un
      test.
- [ ] 1.6 Un finding Shortcuts seul est rendu comme un support Shortcuts, sans
      formulation Siri ni Apple Intelligence. Vérifié par un test.
- [ ] 1.7 Un finding `unknown` est rendu comme indécis, jamais comme non supporté
      ni comme implémenté, et une capability absente du rapport n'est pas
      nommée du tout. Vérifié par un test.
- [ ] 1.8 La section humaine est présente et vide, et le livrable énonce ses
      limites: audit en lecture seule et local, absence rapportée comme
      `unknown` et non `missing`, comportement Siri non observé par l'audit.
      Vérifié par un test qui affirme que la section existe et ne contient aucun
      finding.
- [ ] 1.9 Un fichier qui n'est pas du JSON valide sort en non-zéro, nomme le
      fichier, et n'écrit aucun livrable. Vérifié par un test de la commande.

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
