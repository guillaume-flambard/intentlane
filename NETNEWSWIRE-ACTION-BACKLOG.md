# Catalogue pilote NetNewsWire

Statut au 23 septembre 2026. Ce document est un backlog de validation, pas une
affirmation que chaque ligne est déjà disponible dans Siri.

## Noyau Siri AI, à fermer avant toute extension

| Priorité | Action | Surface | Risque | État de preuve |
| --- | --- | --- | --- | --- |
| 1 | Chercher des articles | `system.searchInApp` | faible | App Intents automatisé, observation Siri à finaliser |
| 2 | Choisir puis ouvrir un article | `system.open` + `Article` | faible | App Intents automatisé, sélection Siri manuelle à finaliser |
| 3 | Aucun résultat pour un titre inventé | même entité | faible | test automatisé passé, observation Siri à finaliser |

## Automatisations métier à entraîner une par une

| Ordre | Action proposée | Objet | Risque | Condition de mise en oeuvre |
| --- | --- | --- | --- | --- |
| 4 | Marquer lu | article | faible | implémenté et couvert par test système |
| 5 | Marquer non lu | article | faible | implémenté et couvert par test système |
| 6 | Ajouter aux favoris | article | faible | implémenté et couvert par test système |
| 7 | Retirer des favoris | article | faible | implémenté et couvert par test système |
| 8 | Ouvrir un flux | flux | faible | implémenté et couvert par test système |
| 9 | S'abonner à un flux | URL de flux | moyen | implémenté local (whitelist localhost) + test, hors Raccourcis |
| 10 | Se désabonner d'un flux | flux | élevé | implémenté (auth locale + confirmation) + test, hors Raccourcis |
| 11 | Actualiser un flux | flux ou dossier | faible | implémenté (flux pilote local uniquement) + test |
| 12 | Marquer tous les articles lus | flux/dossier | élevé | implémenté (comptage + dialog) + test |
| 13 | Créer un dossier | dossier | moyen | implémenté (validation du nom + collision) + test |
| 14 | Déplacer un flux | flux, dossier | moyen | implémenté (contrôles d'appartenance) + test |
| 15 | Supprimer un dossier ou flux | dossier/flux | destructif | implémenté pour dossier vide + flux local (auth + refus si non vide) + test |

Les lignes 4 à 15 sont des App Intents personnalisés, hors catalogue Siri AI.
Les lignes 9 à 15 sont couvertes par le runbook du 2026-09-23 (22/22 tests App
Intents verts, macOS 27.0 build 26A428) et ne sont PAS exposées dans Raccourcis :
elles restent des actions d'entraînement testées par contrat, à entraîner une
par une sous un profil d'entraînement explicitement séparé.

## Ordre de test invariant

Pour chaque ligne : test de contrat, build et métadonnées, cas positif, cas
négatif, état visuel dans l'application, puis second testeur. Aucune action
suivante ne passe en "validée" tant que la précédente de même niveau de risque
n'a pas une preuve écrite dans le ledger.
