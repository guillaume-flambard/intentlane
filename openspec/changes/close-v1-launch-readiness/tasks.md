## 1. Truth and technical closure

- [ ] 1.1 Fermer C0 : réconcilier `ROADMAP.md`, `CLAIMS-REGISTRY.md`,
  `PILOT-NETNEWSWIRE.md` et les changes pilotes. Rouvrir toute case qui
  prétend une preuve Siri ou une reproduction sans ledger valide.
- [ ] 1.2 Fermer `compare-audit-baselines` intégralement, avec fixtures,
  sorties, `--fail-on regression`, documentation et CI.
- [ ] 1.3 Fermer `validate-pilot-evidence-ledger` intégralement, avec
  `evidence validate --strict`, fixtures et limitation commerciale calculée.
- [ ] 1.4 Corriger les dérives documentaires vérifiées, en particulier toute
  section qui présente la couche App Schema comme absente alors qu'elle existe.
- [ ] 1.5 Exécuter `pnpm test`, `pnpm build` et `git diff --check`; joindre les
  sorties à la release candidate.

## 2. Apple 27 compatibility gate

- [x] 2.1 Relever Xcode, SDK macOS/iOS, OS, build et disponibilités réelles;
  mettre à jour le catalogue avec une source Apple ou SDK par assertion.
- [x] 2.2 Ajouter `min_macos` au contrat ou documenter explicitement pourquoi
  il ne peut pas être une entrée de contrat; l'audit ne doit plus masquer une
  disponibilité macOS inconnue sous une promesse iOS.
- [x] 2.3 Ajouter une fixture ou une limitation testée pour tout bug Apple 27
  qui touche les parcours choisis, y compris la sélection d'`OpenIntent` quand
  plusieurs types d'entité coexistent.
- [x] 2.4 Décider, par surface, si les nouveautés 27 restent demand-gated ou
  si un pilote les exige. Créer un change séparé avant toute implémentation.

## 3. Human evidence gates

- [ ] 3.1 Faire passer le ledger NetNewsWire par le validateur; consigner les
  trois parcours, leurs négatifs, conditions, build, artefacts et Siri macOS.
- [ ] 3.2 Obtenir la reproduction par une seconde personne depuis un checkout
  propre; ne pas utiliser l'auteur de la première preuve.
- [ ] 3.3 Sélectionner un pilote iOS éligible, construire sur appareil et
  exécuter la même échelle de preuve, y compris les négatifs.
- [ ] 3.4 Produire le delta macOS/iOS et extraire seulement les règles d'audit
  qui sont démontrées sur les deux plates-formes.
- [ ] 3.5 Constituer cinq pilotes consentis, dont deux apps existantes. Les
  feedbacks sans ledger restent hors claims.

## 4. Distribution and market gate

- [ ] 4.1 Faire réaliser le quickstart depuis un clone vierge par une personne
  externe, sans assistance, en moins de 30 minutes ou ouvrir une issue exacte.
- [ ] 4.2 Le propriétaire npm confirme le nom et la version; vérifier les
  tarballs, publier CLI et plugin, puis réinstaller depuis le registre dans un
  dossier vierge et exécuter le parcours Expo réel.
- [ ] 4.3 Décider les politiques open core nécessaires (sécurité, conduite,
  mainteneurs, triage, releases), puis fermer les tâches dépendantes.
- [ ] 4.4 Obtenir les autorisations écrites, construire une étude macOS et une
  iOS depuis des ledgers `verified`, puis relire la landing contre le registre
  de claims avant publication.

## 5. Release decision

- [ ] 5.1 Générer le contrôle `openspec/LAUNCH-CONTROL.md` à partir des
  artefacts réels et marquer chaque ligne `closed`, `human-gate`,
  `owner-decision` ou `blocked`.
- [ ] 5.2 Autoriser la sortie seulement si aucun item bloquant n'est ouvert et
  si chaque claim public est inférieur ou égal à la preuve calculée.

