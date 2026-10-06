# Migrer le pilote NetNewsWire vers la convention de contrat

## Why

Le texte initial de cette proposition décrivait un brouillon de contrat sans
scripts de preuve. Cet état est périmé. Le paquet versionné existe maintenant
dans `pilots/netnewswire/`, avec un contrat, un manifeste, une intégration
reproductible et trois commandes de test.

La migration doit aligner la qualification et cette liste de tâches sur le
paquet réellement versionné, sans transformer une preuve machine en preuve
humaine ni reprendre les anciens nombres de tests qui n'ont pas de suites
versionnées.

## État vérifié

`pilots/netnewswire/pilot.yaml` déclare exactement `contract`, `generated` et
`metadata`, avec une commande versionnée pour chaque claim. Le paquet épingle
NetNewsWire à `0184ca38c586078117a21f96f68eef78d39b8f68`. Les résultats machine
et leurs limites sont consignés dans
[`PILOT-NETNEWSWIRE-MACHINE-EVIDENCE-2026-10-02.md`](../../../docs/pilots/PILOT-NETNEWSWIRE-MACHINE-EVIDENCE-2026-10-02.md).

Les anciens comptes rendus de fork et le ledger racine
`PILOT-NETNEWSWIRE-LEDGER.yaml`, qui porte l'observation historique macOS 27.0
build 26A428, restent des archives distinctes. Ils ne sont ni réécrits ni
remplacés par ce relevé. Les gates humaines 4 et 5 restent ouvertes.

## Portée et limites

- Cette réconciliation porte sur les documents du changement et la preuve du
  paquet versionné. Elle ne modifie aucun code produit ni contrat de capacité.
- Les suites historiques `applicationTests`, `integrationTests` et `indexSync`
  n'ont jamais été versionnées. Aucun résultat des gates `contract`, `generated`
  ou `metadata` ne les valide.
- Les exigences proposées pour ASRi sont décrites dans la spécification delta active
  [`asri-adapter-templates`](../add-asri-adapter-templates/specs/asri-adapter-templates/spec.md).
  Ce changement incomplet ne devient pas une promesse normative; ses tâches
  inachevées restent ouvertes.
- Aucun résultat Siri, Spotlight ou de reproduction humaine indépendante n'est
  ajouté ici. Voir `docs/pilots/HUMAN-GATES-PREP.md` pour les gates 4 et 5.

Le changement conserve `skip_specs: true`: cette réconciliation documentaire
n'introduit pas de nouveau comportement produit. Il reste ouvert jusqu'à
l'acceptation humaine prévue par les gates existantes.
