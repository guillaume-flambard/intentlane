# Analyse holistique — IntentLane

Générée le 27 septembre 2026 après analyse complète du code, de la doc, de la CI, des packages, des pilotes et de la stratégie commerciale.

---

## Vue d'ensemble

**IntentLane** est un compilateur déterministe YAML → Apple App Intents (Swift).  
Monorepo pnpm, 8 packages, ~35 fichiers de test (core), 4 jobs CI, 318+ tests.

| Couche | Statut |
|---|---|
| Contrat 0.1 + validation Zod | ✅ Fait |
| Générateur Swift déterministe | ✅ Fait (vérifié byte-for-byte en CI) |
| Plugin Expo idempotent | ✅ Fait |
| CLI (init, validate, generate, doctor, audit, verify, audit-diff, evidence) | ✅ Fait |
| Audit engine (12 modules, 6 états, diagnostics ILA) | ✅ Fait (Phase A Siri 27) |
| Pilote IINA macOS (6 claims mécaniques certifiés) | ✅ Fait |
| Preuve Siri/Spotlight réelle | ❌ Bloqué (ledger IINA: toutes les couches `blocked`) |
| Publication npm @intentlane/expo | ❌ Bloqué (scope org) |
| Gate quickstart externe (<30 min) | ❌ Non mesuré |
| Gate 5 pilotes (dont 2 apps existantes) | ❌ Non mesuré |

---

## 1. Architecture du code — optimisations

### 1.1 Export flat dans `packages/core/src/index.ts`

**Problème :** 30+ modules ré-exportés via `export * from "./audit.js"`, `export * from "./claims.js"`, etc.  
Cela crée un namespace plat potentiellement conflictuel. Si deux modules exportent un même nom, le dernier gagne silencieusement.

**Recommandation :** Restructurer avec un namespace explicite :

```ts
// Au lieu de :
export * from "./audit.js";
export * from "./claims.js";

// Faire :
export { runAudit, AuditReport, AuditState, ... } from "./audit.js";
export { evaluateClaim, ClaimSet, ... } from "./claims.js";
```

Ou créer un barrel avec préfixe :

```ts
import { AuditReport } from "./audit.js";
import { Claim } from "./claims.js";
// Redirection
export { AuditReport, Claim };
```

### 1.2 Correction des chemins de CI — incohérence bundle vs source

**Problème :** `pnpm build` dans `package.json` enchaîne `tsc --noEmit && pnpm bundle` (bundle esbuild → `dist/index.cjs`).  
Pourtant, dans `.github/workflows/ci.yml`, la génération utilise :

```yaml
- run: pnpm exec tsx packages/cli/src/index.ts generate
```

C'est la source TypeScript, pas le bundle compilé. Le bundle n'est pas testé dans la CI (sauf dans le job `simulator`).  
Si `esbuild` cassait demain, seul le job `simulator` le détecterait.

**Recommandation :** Unifier — tester le bundle partout :

```yaml
- run: node packages/cli/dist/index.cjs generate
```

Et ajouter un test CI qui vérifie que `dist/index.cjs` existe et s'exécute.

### 1.3 Version unique du schéma (0.1) — pas de migration

**Problème :** `z.literal("0.1")` est codé en dur dans `packages/schema/src/index.ts`.  
Aucune migration 0.1→0.2 n'existe. Dès qu'un champ change, tous les contrats 0.1 cassent.

**Recommandation :** Extraire la version dans un registre de migrations :

```ts
const SCHEMA_VERSIONS = {
  "0.1": intentLaneConfigSchema_v01,
  "0.2": intentLaneConfigSchema_v02, // futur
} as const;
```

Et faire un `migrate(input: { schema: "0.1", ... }): "0.2"` explicite.

### 1.4 Absence de dépendance inter-packages dans `turbo.json`

**Problème :** `turbo.json` déclare `"build": { "dependsOn": ["^build"] }` mais `packages/core/package.json` n'a pas de dépendance vers `packages/schema` dans son `package.json` — la dépendance est faite par import relatif en dur (`../../schema/src/index.js`).

**Recommandation :** Rétablir les dépendances formelles entre packages :

```json
// packages/core/package.json
{
  "dependencies": {
    "@intentlane/schema": "workspace:*"
  }
}
```

Et remplacer les imports relatifs par des imports de package.

### 1.5 Le script `verify` est destructeur

**Problème :** `"verify": "rm -rf .intentlane/generated /tmp/intentlane-second && ..."`

Si `.intentlane/` était lié ailleurs ou contenait des données non versionnées, `rm -rf` les détruirait.  
Aussi, `/tmp/` n'est pas nettoyé si le script échoue.

**Recommandation :** Utiliser `mktemp -d` :

```sh
tmpdir=$(mktemp -d)
pnpm generate --output "$tmpdir/second"
diff -r .intentlane/generated "$tmpdir/second"
rm -rf "$tmpdir"
```

---

## 2. Tests et qualité

### 2.1 Gap : pas de test E2E du pipeline IINA complet

**Problème :** Le pilote IINA est certifié mécaniquement, mais les tests sont des scripts shell hors du runner vitest.  
Aucun test CI qui enchaîne `contract → generate → swiftc → verify` pour IINA.

**Recommandation :** Ajouter un test E2E dans `packages/core/src/pilot-integration.test.ts` qui :

1. Charge le `pilots/iina/contract.yaml`
2. Vérifie que `generate` le compile
3. Vérifie que `verify --pilot pilots/iina/pilot.yaml` retourne `certified`

### 2.2 Gap : Pas de test de performance pour 50+ intents

**Problème :** Le PRD spécifie "Génération < 2s pour 50 intentions" — aucun test benchmark ne le vérifie.

**Recommandation :** Ajouter un test `audit-performance.test.ts` :

```ts
test("generate 50 intents under 2s", async () => {
  const ir = generateFixture(50); // fixture builder
  const start = Date.now();
  await generateArtifacts(ir);
  assert(Date.now() - start < 2000);
});
```

### 2.3 Dérive du nombre de tests dans la doc

`OPEN-CORE-READINESS.md` dit "309 tests", `CLIENT-READY-V1.md` dit "318 tests".  
À chaque ajout, les deux fichiers doivent être mis à jour — ou mieux, automatisé.

**Recommandation :** Remplacer les nombres en dur par une référence dynamique dans la CI :

```yaml
- name: Update test count in docs
  run: |
    count=$(pnpm test --reporter=json | jq '.numTests')
    sed -i "s/[0-9]\+ tests)/$count tests)/g" OPEN-CORE-READINESS.md CLIENT-READY-V1.md
```

Ou simplement les retirer de la prose et ne garder qu'une mention "see CI badge".

---

## 3. Stratégie produit et commerciale

### 3.1 Le pilote IINA est techniquement certifié mais commercialement muet

**Analyse :** IINA a 6/6 claims mécaniques certifiés (contract, generated, applicationTests, integrationTests, metadata, indexSync).  
Mais **spotlight** et **siri** sont `blocked` dans l'evidence ledger — aucune preuve visuelle réelle.  
C'est un pilote génial pour montrer que "ça compile et les métadonnées sont bonnes", mais insuffisant pour vendre "Siri dans votre app".

**Recommandation immédiate :** Documenter et célébrer les 6 claims comme "Automated Certification — no human in the loop" (c'est déjà dans CLAIMS-REGISTRY.md, ligne 22).  
C'est un argument commercial distinct : "Nous pouvons certifier 100% de ce qu'une machine peut prouver."

Mais il faut absolument **débloquer un des deux :**
- Soit reproduire le IINA spotlight/siri avec un vrai Mac et un vrai observateur
- Soit lancer un pilote iOS 27 avec une app qui a déjà une surface Siri observable

### 3.2 Pipeline commercial — les cibles sont bonnes, mais froides

**Analyse :** Goodnotes, MindNode, DEVONthink, Ivory, Readdle — toutes sont des prospects non contactés.  
Le premier contact devrait être *précédé* par un audit gratuit du dépôt public (quand il existe).

**Recommandation :** Automatiser un "one-click audit report" pour les dépôts GitHub publics :

```sh
intentlane audit https://github.com/goodnotes/goodnotes-ios --format markdown
```

Et envoyer le rapport avec une ligne d'objet du type :

> "Audit de compatibilité Siri macOS 27 gratuit — Goodnotes : 3 capacités détectées, 12 manquantes"

### 3.3 Le "quickstart gate" n'est pas mesuré

**Problème :** La Phase 2 a pour gate "un utilisateur externe suit le quickstart en moins de 30 minutes" — jamais mesuré.

**Recommandation :** Transformer cela en test CI utilisable :

- Ajouter `apps/stress-test/` qui simule un quickstart automatisé (timestamps)
- Publier une GitHub Action `intentlane/quickstart-test` qui clone, installe, init, valide, génère et mesure
- Ajouter un badge "Quickstart < 30 min" dans le README

### 3.4 Le problème de l'evidence ledger IINA

Le ledger IINA est à `revision: bab9c834` avec `reproduction: { by: "none yet", status: blocked }`.  
C'est honnête, mais ça bloque toute communication "Siri pilot".

**Recommandation :** Deux options :

**Option A (recommandée) :** Faire reproduire par une deuxième personne — même technique, même fork.  
Mettre à jour `reproduction.by` et `reproduction.status`. Même si c'est "un autre ingénieur", ça compte comme indépendant.

**Option B :** Séparer le claim "certification automatisée" (déjà `Proven`) du claim "Siri journey" (qui reste `Awaiting proof`) et communiquer uniquement sur la certification automatisée jusqu'à ce que le Siri soit prouvé.

---

## 4. Open source readiness

### 4.1 Publication npm bloquée

**Problème :** `@intentlane/expo` ne peut pas être publié — l'org `@intentlane` n'existe pas sur npm.

**Recommandation :** Créer l'org npm `@intentlane` ou publier sous `@memolabs-apps/intentlane-expo` en attendant.

### 4.2 Artefacts manquants pour un repo open source professionnel

| Artefact | Statut | Priorité |
|---|---|---|
| CHANGELOG.md | ❌ | Haute (sans ça, pas de release notes) |
| SECURITY.md | ❌ | Haute (vulnérabilités) |
| CODE_OF_CONDUCT.md | ❌ | Moyenne (contributeurs) |
| GOVERNANCE.md | ❌ | Moyenne (décisions) |
| dependabot.yml | ❌ | Haute (sécurité des dépendances) |
| good-first-issue labels | ❌ | Basse |
| Pull request template | ❌ | Basse |

Pas besoin d'un `GOVERNANCE.md` complexe — juste qui prend les décisions et comment.

### 4.3 `dist/index.cjs` versionné dans git

**Problème :** `packages/cli/dist/index.cjs` est commité (car `pnpm build` le produit et que `verify` en dépend).  
C'est une pratique qui peut surprendre les contributeurs.

**Recommandation :** Soit garder (`pnpm bundle` est déterministe et vérifié en CI), soit ajouter `.gitignore` avec exception documentée.  
L'état actuel est cohérent, mais il faut le documenter dans `CONTRIBUTING.md`.

---

## 5. Quick wins (peu d'effort, grand impact)

| Action | Effort | Impact | Priorité |
|---|---|---|---|
| Unifier CI : utiliser `dist/index.cjs` partout | 1h | ⭐⭐⭐ | **P0** |
| `mktemp -d` dans le script verify | 10 min | ⭐⭐ | **P0** |
| Créer l'org npm @intentlane | 30 min | ⭐⭐⭐ | **P0** |
| Ajouter SECURITY.md (+ dependabot.yml) | 30 min | ⭐⭐⭐ | **P0** |
| Ajouter CHANGELOG.md (+ workflow release) | 2h | ⭐⭐⭐ | **P0** |
| Remplacer `export *` par exports nommés | 1h | ⭐⭐ | **P1** |
| Synchroniser le nombre de tests dans la doc | 30 min | ⭐ | **P1** |
| Ajouter test perf 50 intents < 2s | 1h | ⭐ | **P1** |
| Automatiser l'audit d'un dépôt public | 4h | ⭐⭐⭐ | **P1** |
| Faire reproduire IINA par quelqu'un d'autre | 2-4h | ⭐⭐⭐ | **P2** |
| Mesurer le quickstart gate | 4h | ⭐⭐⭐ | **P2** |
| Ajouter test E2E IINA pipeline | 3h | ⭐⭐ | **P2** |

---

## 6. Conclusion

**IntentLane est un produit solide, incroyablement bien documenté, avec une architecture claire et une stratégie de preuve rigoureuse.**  
Ce qui manque n'est pas technique — c'est la **boucle « preuve → communication → adoption »** qui n'est pas encore fermée.

**Les vrais freins :**

1. **Pas de preuve Siri réelle** → pas de cas client publiable → pas de traction commerciale
2. **npm publication bloquée** → personne ne peut installer `@intentlane/expo` proprement
3. **Gate utilisateur non mesuré** → on ne sait pas si le quickstart tient la promesse < 30 min
4. **Open-core artefacts manquants** → pas prêt pour des contributeurs externes

Tu as 300+ tests, une CI robuste, 5 packages fonctionnels, un audit engine complet, un pilote certifié…  
Mais le vrai passage à l'échelle (commercial + open source) demande de **boucler les preuves réelles** et de **débloquer la publication**.