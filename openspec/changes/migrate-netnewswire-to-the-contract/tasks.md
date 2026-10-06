# Tasks

La source des claims machine est
[`pilots/netnewswire/pilot.yaml`](../../../pilots/netnewswire/pilot.yaml). Cette
réconciliation ne valide que les trois claims qu'il déclare. La preuve et ses
limites sont dans
[`PILOT-NETNEWSWIRE-MACHINE-EVIDENCE-2026-10-02.md`](../../../docs/pilots/PILOT-NETNEWSWIRE-MACHINE-EVIDENCE-2026-10-02.md).

## Requirements and acceptance

### REQ-01 - Déclarer uniquement les claims versionnés

Le relevé courant MUST nommer exactement les claims `contract`, `generated` et
`metadata` du manifeste et leurs commandes de gate versionnées.

**AC-01** - En lisant le manifeste, le README et les scripts de test, chaque
claim du relevé correspond à un claim déclaré et à une commande existante.
Vérification: inspection documentaire. Preuve: manifeste, README et note
d'évidence.

### REQ-02 - Ancrer les résultats dans les exécutions disponibles

Le relevé MUST distinguer la reproduction épinglée de l'exécution indépendante
de `run-all-tests.sh`, et MUST conserver les limites observées du journal.

**AC-02** - Les journaux indiquent le commit épinglé, la génération, le build,
la surface de métadonnées et la réussite des trois gates; le relevé précise que
le workspace de build a été réutilisé. Vérification: inspection des journaux
locaux référencés dans la note d'évidence.

### REQ-03 - Ne pas inférer les anciennes suites

Les suites historiques `applicationTests`, `integrationTests` et `indexSync`
MUST rester explicitement non prouvées et absentes des claims courants tant
qu'aucune suite versionnée ne les exécute. La validation du contrat et la
vérification des métadonnées MUST NOT être présentées comme preuve du
comportement de résolution, d'exposition ou de cycle de vie de l'index.

**AC-03** - Aucun résultat de contrat, de génération ou de métadonnées n'est
présenté comme preuve de ces suites; leur absence et leur raison sont écrites
dans la qualification et la note d'évidence. Vérification: inspection des
fichiers versionnés et des documents. Les règles déclaratives
`source_disabled` et `item_missing` restent distinguées de leur comportement à
l'exécution. Preuve: manifeste, qualification et note d'évidence.

### REQ-04 - Préserver les gates humaines et l'observation historique

La réconciliation MUST laisser les gates humaines 4 et 5 ouvertes, ne MUST
ajouter aucune observation humaine et MUST préserver l'observation existante
macOS 27.0 build 26A428.

**AC-04** - La qualification et la note d'évidence indiquent que la gate 4
attend les étapes humaines 1 à 6 sur la cible actuelle macOS 27.0.1 build
26A434, puis que la gate 5 attend un second testeur depuis un checkout propre;
le protocole et le résultat
historique 26A428 du ledger racine ne sont pas modifiés. Vérification:
comparaison avec `PILOT-NETNEWSWIRE-LEDGER.yaml`,
`openspec/LAUNCH-CONTROL.md`, `HUMAN-GATES-PREP.md` et
`MANUAL-SIRI-ACCEPTANCE.md`.

### REQ-05 - Pointer vers l'autorité ASRi existante

La documentation de migration MUST pointer vers la spécification delta active
`add-asri-adapter-templates` comme description canonique de la portée proposée
et MUST NOT présenter ses tâches inachevées comme livrées ou comme promesse
normative.

**AC-05** - Les références ASRi de cette réconciliation pointent vers la
spécification delta; les tâches inachevées de ce changement restent inchangées.
Vérification: inspection des liens et de la liste de tâches delta.

## 0. Reconcile the stale migration record

- [x] 0.1 Remplacer les anciennes affirmations selon lesquelles le paquet et ses
      scripts n'existent pas par les chemins réellement versionnés.
      Preuve: `pilots/netnewswire/pilot.yaml` et son README.
- [x] 0.2 Retirer les nombres de tests historiques non étayés et séparer les
      claims machine des suites absentes.
      Preuve: `QUALIFICATION.md` et la note d'évidence.
- [x] 0.3 Relier les résultats de build et de gates aux journaux disponibles,
      sans les convertir en preuve d'un checkout propre ou d'une expérience
      humaine.
      Preuve: la note d'évidence avec provenance et limites.
- [x] 0.4 Préserver l'observation historique 26A428 et laisser les gates 4 et 5
      ouvertes.
      Preuve: `HUMAN-GATES-PREP.md`, `MANUAL-SIRI-ACCEPTANCE.md` et la note.
- [x] 0.5 Faire de la spécification delta ASRi active la référence canonique de
      la portée proposée, sans la transformer en promesse normative ni clôturer
      ses tâches inachevées.
      Preuve: lien vers `add-asri-adapter-templates/specs/asri-adapter-templates/spec.md`.

## 1. Deferred scope and human gates

Les suites historiques `applicationTests`, `integrationTests` et `indexSync`
restent différées: elles vivaient dans un fork jetable, ne sont pas présentes
dans le paquet versionné et aucun script actuel ne les exécute. Cette décision
de périmètre ne les marque pas comme réussies et ne crée aucun claim pilote.
Le contrat déclare les règles d'exposition `source_disabled` et `item_missing`,
mais les gates versionnées ne vérifient pas leur comportement à l'exécution,
la résolution exacte d'une entité ni le cycle de vie de l'index. Ces propriétés
restent non prouvées par le claim set courant.

- [ ] 1.1 **Gate 4, humain** - Effectuer les étapes 1 à 6 du protocole manuel
      sur macOS 27.0.1 build 26A434 et consigner une nouvelle observation
      humaine par la procédure existante.
      Dépendance: aucune. Vérification: observation par une personne.
- [ ] 1.2 **Gate 5, humain indépendant** - Après la gate 4, un second testeur
      reproduit les étapes 1 à 6 depuis un checkout propre et sur une session
      distincte.
      Dépendance: 1.1. Vérification: observation d'un second testeur.

Ne pas archiver ce changement tant que les gates humaines restent ouvertes.
