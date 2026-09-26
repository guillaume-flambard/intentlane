# Tâches

## 1. Contrat : le manifeste de sondes

- [x] Exiger du manifeste une version et au moins une sonde, et refuser un
      `probes` vide.
- [x] Exiger de chaque sonde un `id`, une `question`, une `command` et un `format`,
      et refuser une sonde sans question en pointant la sonde.
- [x] Refuser une sonde déclarée deux fois en nommant la seconde.
- [x] Tester chaque forme invalide dans `packages/schema`.

## 2. Domaine : une observation ne porte aucun verdict

- [x] Ne définir aucun champ de verdict sur une observation, et le tester en
      comparant les clés produites.
- [x] Enregistrer comme détail le texte imprimé, y compris `PASS`, sans en faire un
      `pass`.
- [x] Ne retourner aucun champ de certification depuis la commande, et le tester.

## 3. Domaine : une absence reste distinguishable

- [x] Enregistrer une sonde qui ne peut pas tourner comme `unavailable`, confiance 0,
      sans l'omettre du rapport.
- [x] Enregistrer une sonde qui a tourné et a rapporté un négatif comme `absent`.
- [x] Tester que les deux sont distincts, et qu'une sonde sans observation est
      listée comme non observée.

## 4. Reproductibilité

- [x] Porter sur chaque observation la commande exacte, le statut de sortie et la
      confiance avec sa distribution.
- [x] Dériver la confiance d'une sonde textuelle du seul statut de sortie, et le
      tester en comparant une sortie bavarde et une sortie vide.
- [x] Permettre à une sonde `json` de déclarer sa propre confiance après
      validation par la même forme que les revendications.

## 5. Lecture illisible

- [x] Enregistrer comme `unreadable` une sortie `json` qui ne se parse pas, avec la
      confiance à 0 et le texte brut conservé.
- [x] Enregistrer comme `unreadable` une confiance hors bornes ou sans
      distribution, plutôt que de l'arrondir.
- [x] Lire un objet nu comme une observation, pour qu'une sonde n'ait pas à emballer
      sa réponse.

## 6. Commande et premier manifeste

- [x] Ajouter `intentlane observe` avec `--format json` et `--output`, en refusant
      un manifeste illisible et en expliquant pourquoi.
- [x] Écrire `pilots/iina/observations.yaml` pointant sur des commandes qui
      existent, et dire dans le fichier quelles sondes manquent encore.
- [x] Refuser un manifeste invalide avant d'avoir exécuté quoi que ce soit, et le
      tester en comptant les appels de la sonde.

## 7. Reste à faire, et n'est pas dans cette change

- [ ] Écrire les deux sondes qui comptent le plus sur IINA : l'acceptation de
      l'app par l'assistant, et l'état de l'index après une lecture réelle. Elles ont
      été établies à la main pendant le pilote, et ne sont pas déclarées ici parce
      qu'une sonde qu'on ne peut pas exécuter est pire qu'une sonde non écrite.
- [ ] Aligner `AuditConfidence`, qui reste `low` / `medium` / `high`, qui est une
      étiquette ordinale et non une mesure, sur la forme de confiance mesurée.
- [ ] Consommer l'observation dans `verify` comme entrée possible d'un
      constat, une fois la couverture de sondes réelle.
