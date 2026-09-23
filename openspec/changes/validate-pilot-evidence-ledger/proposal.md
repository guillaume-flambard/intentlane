## Why

Le pilote NetNewsWire possède des preuves de build et de métadonnées mais les
preuves de surface et la reproduction restent manuelles. Un format vérifiable
localement évite de transformer des notes libres en revendications marketing.

## What Changes

- Ajoute un format de ledger de preuve de pilote, versionné et lisible par une
  machine.
- Ajoute `intentlane evidence validate <ledger>` pour vérifier les exigences
  des parcours et calculer le statut publiable.
- Lie optionnellement le ledger à la baseline et au delta d'audit sans modifier
  le dépôt du pilote ni envoyer des données.

## Non-goals

- Ne pilote pas Siri, Shortcuts, Spotlight, Xcode, un appareil ou un compte
  Apple.
- Ne crée pas de preuve, ne vérifie pas les captures et ne publie aucune étude
  de cas.
- Ne collecte ni identifiants, ni contenu de production, ni transcription Siri.

## Impact

Schéma ou parseur de ledger, module core, CLI, fixtures, `PILOT-PLAYBOOK.md`,
`COMMERCIAL-READINESS.md` et documentation de l'offre d'audit.

