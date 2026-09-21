# IntentLane — Product Requirements Document

## Vision

Permettre aux équipes cross-platform d'exposer les capacités de leur application aux assistants et surfaces système à partir d'un contrat unique, lisible et versionné.

## Objectif MVP

Un développeur Expo peut déclarer des actions et des entités en YAML, générer le code Swift nécessaire, compiler son projet et retrouver ces actions dans Shortcuts/Siri sans écrire manuellement App Intents.

## Non-objectifs MVP

- Dashboard cloud.
- Flutter, Capacitor ou Android.
- Découverte automatique complète du repository.
- Analytics Siri exhaustives.
- Génération libre par LLM dans le chemin critique.
- Éditeur visuel.
- Paiement et multi-tenant.

## Persona primaire

Développeur TypeScript utilisant Expo prebuild/EAS, à l'aise avec les APIs mais peu expérimenté en Swift. Il veut une intégration native sans maintenir une extension générée à la main.

## Jobs to be done

1. Décrire une capacité métier une seule fois.
2. Savoir si elle est compatible avec une version d'iOS.
3. Générer du code Swift déterministe.
4. Connecter l'intention à une action sûre de l'app.
5. Tester et détecter les régressions dans CI.

## Parcours principal

```text
Install → init → edit YAML → validate → generate → expo prebuild → run → invoke
```

## User stories P0

- En tant que dev Expo, je peux initialiser une configuration valide.
- Je peux déclarer une intention avec texte, nombre, booléen, date et enum.
- Je peux choisir `open_app`, `native` ou `http` comme mode d'exécution.
- Je peux déclarer une entité recherchable par identifiant.
- Je peux fournir des phrases localisées.
- Le générateur produit toujours le même code pour la même entrée.
- Le plugin Expo ajoute les fichiers et réglages nécessaires sans écraser les modifications non possédées.
- `doctor` explique les prérequis manquants.
- `validate` échoue avant génération pour toute configuration dangereuse ou incohérente.

## Exigences fonctionnelles

### Configuration

- YAML validé par JSON Schema.
- Version obligatoire du schéma.
- Identifiants stables en `snake_case`.
- Localisation au minimum `en` et `fr`.
- Valeurs secrètes interdites dans le fichier.

### Génération

- Swift formaté et déterministe.
- Manifest listant chaque fichier possédé avec hash.
- Mise à jour atomique.
- Suppression seulement des fichiers anciennement générés.
- `--check` échoue si le code généré n'est pas à jour.

### Exécution

- `open_app` ouvre une route/deep link avec paramètres validés.
- `native` appelle un handler Swift enregistré.
- `http` utilise une configuration native bornée, avec authentification déléguée à l'app.
- Une intention destructive impose confirmation et authentification explicites.

### Diagnostics

- Version Xcode/Swift/iOS cible.
- Présence du plugin.
- collisions d'identifiants ;
- phrases ambiguës ;
- paramètres non supportés ;
- absence de stratégie hors ligne ;
- incompatibilités de disponibilité OS.

## Exigences non fonctionnelles

- Aucun secret envoyé à IntentLane dans le MVP local.
- Génération < 2 s pour 50 intentions.
- Tests unitaires du core sur Linux/macOS ; tests Swift sur macOS.
- 90 % de couverture du parser et du générateur.
- Erreurs structurées et actionnables.
- SemVer sur schéma et générateur.

## Métriques

- Time-to-first-intent < 15 minutes.
- Taux de succès du quickstart > 80 %.
- Zéro diff lors d'une seconde génération identique.
- Au moins 5 projets pilotes.
- Au moins 3 intégrations conservées après 30 jours.

## Critères d'acceptation de la démo

1. `create_idea(title)` apparaît dans Shortcuts.
2. La phrase vocale transmet le titre.
3. L'intention ouvre l'app ou exécute un handler natif.
4. Le résultat affiche une vue de confirmation.
5. Une entité `Idea` est sélectionnable.
6. Une erreur réseau produit un message contrôlé.
7. Les tests et snapshots passent dans CI.

