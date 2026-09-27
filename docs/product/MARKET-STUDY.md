# IntentLane — étude de marché

## Résumé

L'opportunité ne vient pas de l'absence d'API Apple : App Intents existe déjà. Elle vient du coût d'adoption pour les équipes cross-platform, du manque de modélisation produit et du manque de tests reproductibles.

La meilleure entrée de marché est un outil développeur open source pour Expo, complété plus tard par une couche SaaS de CI et de gouvernance.

## Problème

Une équipe Expo ou React Native doit aujourd'hui comprendre Swift, App Intents, les contraintes d'exécution, les entités, les phrases, Spotlight, les extensions et le cycle de build natif. Les assistants de code peuvent écrire du Swift, mais ne fournissent pas à eux seuls :

- un contrat portable et versionné ;
- une génération déterministe ;
- une matrice de compatibilité OS ;
- des règles de sécurité ;
- des tests de régression ;
- une future sortie Android depuis la même spécification.

## Segments

| Segment | Douleur | Volonté de payer | Priorité |
|---|---:|---:|---:|
| Apps Expo/RN avec produit établi | Forte | Moyenne | 1 |
| Agences mobiles | Très forte et répétée | Forte | 1 |
| SaaS B2B avec app compagnon | Moyenne | Forte | 2 |
| Développeurs Swift natifs | Faible à moyenne | Faible | 3 |
| Flutter/Capacitor | Forte | Moyenne | Après validation |

## Alternatives actuelles

| Alternative | Force | Limite face à IntentLane |
|---|---|---|
| App Intents écrit à la main | Contrôle maximal | Expertise Swift, temps, maintenance |
| Génération par LLM | Rapide | Non déterministe, peu de garanties |
| Xcode et documentation Apple | Officiel | Centré Swift, pas de contrat cross-platform |
| Shortcuts personnalisés | Accessible | Configuration utilisateur, pas une intégration produit industrialisée |
| Développement agence | Livrable complet | Coûteux, peu réutilisable |

## Concurrence

Aucun produit significatif trouvé ne combine actuellement DSL cross-platform, génération App Intents, plugin Expo et tests de contrat. Cette absence peut indiquer une niche ouverte, mais aussi une demande encore petite. Il faut valider la douleur avant le dashboard SaaS.

## Positionnement

> IntentLane is the contract and compiler between your app and system assistants.

Ne pas vendre « Siri dans votre app ». Vendre :

- une intégration native en heures plutôt qu'en jours ;
- une seule source de vérité ;
- des builds reproductibles ;
- un chemin vers plusieurs assistants et plateformes.

## Go-to-market

1. Plugin Expo open source avec démo spectaculaire de cinq minutes.
2. Documentation « Add Siri to an Expo app » ciblant le référencement développeur.
3. Template GitHub et exemple Todo/CRM.
4. Pilotes gratuits avec 5 équipes Expo.
5. Offre agence « Intent audit + implementation ».
6. SaaS seulement après observation de besoins CI récurrents.

## Prix envisagé

- OSS : CLI, schéma, génération de base.
- Pro individuel : 19–39 €/mois, diagnostics et tests avancés.
- Équipe : 99–299 €/mois, CI, politiques, historique et matrice de compatibilité.
- Audit/intégration : 1 500–8 000 € selon l'app.

## Expériences de validation

| Hypothèse | Test | Seuil |
|---|---|---|
| Les équipes Expo trouvent App Intents difficile | 15 entretiens | 8 douleurs confirmées |
| La génération fait gagner du temps | 5 pilotes | intégration < 2 h |
| Le contrat YAML est accepté | Test utilisateur | 4/5 sans aide directe |
| La CI mérite d'être payée | Landing/prévente | 3 engagements payants |

## Risques

- Apple améliore fortement la génération dans Xcode : défendre le contrat cross-platform et la CI.
- APIs changeantes : matrice de compatibilité et snapshots par version Xcode.
- Exécution JavaScript indisponible dans certains contextes : générer des stratégies explicites (`open_app`, `native`, `http`).
- Marché trop étroit : étendre ensuite à Android App Actions, widgets et autres surfaces depuis le même contrat.
- Marque : vérifier juridiquement IntentLane et réserver les actifs avant communication publique.

## Verdict

Go conditionnel. Construire le compilateur et le plugin Expo, pas le SaaS. Poursuivre si la démo fonctionne et si au moins trois équipes externes demandent à l'utiliser sur une vraie app.

