## 1. Écrire la sémantique

- [ ] 1.1 Porter l'exigence `audit-score` dans
      `specs/audit-score/spec.md`, avec le tableau des points par état, la
      définition du dénominateur, et le fait qu'un score est relatif au
      catalogue.
- [ ] 1.2 Écrire le scénario « le catalogue grandit » : une app inchangée voit son
      score baisser, et le rapport le dit au lieu de le laisser croire à une
      régression.
- [ ] 1.3 Écrire le scénario « lecture par groupe » : le rapport distingue une
      régression d'un catalogue complété, et le total n'est pas une somme
      réordonnée.
- [ ] 1.4 Vérifier qu'aucune exigence de score n'est dupliquée, et que le
      dénominateur est nommé une fois.

## 2. Décision sur `unknown`

- [ ] 2.1 Trancher entre les trois options de `design.md`, et écrire la décision
      dans `design.md` avec la date et la raison. Cette tâche attend une
      décision humaine et ne SHALL pas être déduite par un agent.
- [ ] 2.2 Si l'option 2 est retenue, écrire le mécanisme exact, y compris ce
      qu'un `unknown` devient et comment l'auditeur distingue « applicable » de
      « pas encore applicable », avant d'écrire une ligne de code.
- [ ] 2.3 Si l'option 1 est confirmée,porter la décision dans les docs de vente
      et dans le texte du rapport, et ne rien changer aux nombres.

## 3. Présentation

- [ ] 3.1 Garder le score global en tête de la sortie texte, et la lecture par
      groupe en dessous, pour qu'un rapport long reste lisible.
- [ ] 3.2 Dire dans le rapport contre quel catalogue le score a été calculé, en
      clair, et pas seulement dans le JSON.
- [ ] 3.3 Vérifier que `audit-diff` compare deux scores qui portent la même
      version de catalogue, et qu'il signale le cas contraire plutôt que de
      présenter une variation de score qui est un artefact de catalogue.

## 4. Dépendance

- [ ] 4.1 Déclarer `complete-apple-27-capability-catalogue` dépendant de ce
      change pour ses tâches 2.x et 3.x, et le dire dans les deux proposals.
- [ ] 4.2 Vérifier qu'aucun change ouvert n'ajoute de records au catalogue avant
      que ce change soit tranché.

## 5. Vérification

- [ ] 5.1 `pnpm test`, `pnpm build` et `pnpm validate`.
- [ ] 5.2 Rejouer `intentlane audit` sur une fixture App Intents et une fixture
      Foundation Models, et vérifier que les deux scores se lisent avec la même
      version de catalogue.
- [ ] 5.3 Prouver par un test que l'ajout d'un record au catalogue ne change le
      score d'un projet qui ne l'utilise pas sans que le rapport ne le dise.

## Limite explicite de ce change

Ce change n'écrit pas encore la décision sur `unknown`. Il l'expose, la mesure et
donne le coût de chaque option. La tâche 2.1 attend le propriétaire, parce qu'il
s'agit du chiffre vendu et que « l'audit est plus sévère quand l'outil sait
moins de choses » est une position commerciale, pas une préférence technique.
