# Point d’étape — pivot playground AnSu v5

> Date : juin 2026. Document de pilotage pour reprendre les évaluations runtime et observability/evals avec la méthode v2.

## 1. Décision méthodologique

On ne compare plus des POC isolés. On compare des briques branchées sur le même flux AnSu dans le playground commun.

```txt
seed = debug/remplissage, non décisionnel
mock = dev/debug, non décisionnel
fake = baseline UI, hors benchmark
preuve benchmark = playground + runtime réel + gateway/model réel + observability réelle
```

Référence :

```txt
pocs/playground/
```

Matrice testée :

```txt
runtime × observability/evals × llm gateway × model
```

## 2. Ce qui est validé à date

### Playground

| Élément                                             | Statut           | Preuve                                           |
| --------------------------------------------------- | ---------------- | ------------------------------------------------ |
| UI benchmark                                        | Build OK         | `task playground:build`                          |
| Contrat `TurnRequest → RuntimeResult → TraceResult` | Implémenté       | `pocs/playground/src/contract/types.ts`          |
| Sélecteur runtime                                   | Implémenté       | UI/API                                           |
| Sélecteur observability/evals                       | Implémenté       | UI/API                                           |
| Sélecteur LLM gateway/model                         | Implémenté       | UI/API                                           |
| Trace Langfuse avec metadata complètes              | Validé technique | smoke non décisionnel, comportement déterministe |

### Runtimes

| Runtime                | Statut v2                                               | Notes                               |
| ---------------------- | ------------------------------------------------------- | ----------------------------------- |
| `fake`                 | Dev/debug only                                          | baseline UI, hors benchmark         |
| `langgraph-typescript` | Câblé techniquement                                     | validation benchmark réelle à faire |
| `mastra`               | Validé technique historique, adapter playground présent | à revalider depuis playground       |
| `langgraph-python`     | Validé technique historique, adapter playground présent | à revalider depuis playground       |

### Observability / evals

| Outil      | Statut v2                | Notes                                                             |
| ---------- | ------------------------ | ----------------------------------------------------------------- |
| `langfuse` | Validé technique initial | trace canonique + score + metadata sur smoke ; combo réel à faire |
| `mlflow`   | Validé technique isolée  | seed/eval/prompt registry OK, adapter playground absent           |
| `phoenix`  | POC historique           | à repasser v2                                                     |

## 3. Ce qui est obsolète ou à relire

### À relire fortement

```txt
SYNTHESE_RUNTIME.md
SYNTHESE_OBSERVABILITY_EVALS.md
fiches/runtime-mastra.md
fiches/runtime-langgraph-python.md
fiches/observability/mlflow.md
fiches/observability/langfuse.md
```

Ces documents contiennent des preuves utiles, mais doivent maintenant distinguer :

```txt
Doc
Technique isolée
Playground
Validation Jérémie
```

### À compléter

```txt
fiches/observability/phoenix.md
fiches/runtime-langgraph-typescript.md
```

## 4. Nouvelles questions ajoutées aux plateformes d’éval

Les critères observability/evals v2 ajoutent explicitement :

| ID  | Question                                       |
| --- | ---------------------------------------------- |
| B10 | Peut-on manager les prompts ?                  |
| B11 | Peut-on versionner les prompts ?               |
| B12 | Peut-on injecter des variables efficacement ?  |
| B13 | L’interface est-elle claire, simple et utile ? |

Ces questions sont prioritaires pour Langfuse, MLflow et Phoenix.

## 5. Plan efficace pour l’après-midi

### Bloc 1 — runtime sweep playground, 45–60 min

Objectif : vérifier que chaque runtime respecte le contrat canonique.

Scénarios :

```txt
S0 confusion : Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.
S1 réponse directe : Donne-moi directement la réponse sur la photosynthèse.
S2 combo LLM alternatif : llm.gateway=albert, llm.model=albert-large
```

Runtimes :

```txt
mastra
langgraph-python
langgraph-typescript
```

À noter pour chacun :

- réponse agent ;
- `score.ansu_naivety` ;
- `output.raw.graph` ;
- tool calls/results ;
- provider/model ;
- facilité de lancement ;
- trace Langfuse si observability activée.

### Bloc 2 — Langfuse B v2, 45 min

Objectif : terminer Langfuse en statut benchmark v2, uniquement sur combo réel.

Tests :

- trace playground avec runtime réel (`mastra`, `langgraph-python` ou `langgraph-typescript`) ;
- filtre session/runtime/model ;
- score visible ;
- prompt management ;
- prompt versioning ;
- variables prompt ;
- clarté UI.

### Bloc 3 — MLflow décision, 45–60 min

Deux options :

#### Option A — rapide

MLflow reste :

```txt
Validé technique isolée
```

On documente très proprement ses forces :

- evals ;
- prompt registry ;
- prompt versions ;
- variables ;
- expérience/recherche.

Et son manque :

```txt
adapter playground non câblé
```

#### Option B — meilleure

Câbler un adapter playground minimal :

```txt
TurnResponse → MLflow trace + score
```

Puis répondre à B2/B3/B5/B8/B13 en preuve playground.

### Bloc 4 — Phoenix décision, 30–45 min

Objectif réaliste : ne pas surdocumenter si pas repassé.

Choix possibles :

```txt
Phoenix = à repasser v2
```

ou adapter minimal si temps disponible.

### Bloc 5 — captures d’écran et preuves visuelles, en continu

Pour chaque question UI ou trace importante, produire si possible une capture :

- automatiquement via script Playwright quand l’URL est stable ;
- manuellement par Jérémie quand login/navigation/inspection fine est nécessaire.

Stockage :

```txt
docs/benchmark-agentique/assets/screenshots/
```

Convention :

```txt
YYYY-MM-DD__<question-id>__<outil>__<vue>__<combo>.png
```

La capture doit être référencée dans la fiche avec le `traceId` ou l’URL correspondante.

### Bloc 6 — génération docs, 60–90 min

Documents à régénérer dans cet ordre :

1. `SYNTHESE_RUNTIME.md`
2. `SYNTHESE_OBSERVABILITY_EVALS.md`
3. `fiches/observability/langfuse.md`
4. `fiches/observability/mlflow.md`
5. `fiches/observability/phoenix.md` si repassé
6. éventuellement `fiches/runtime-langgraph-typescript.md`

## 6. Commandes utiles

```bash
# services validés pour le chemin benchmark actuel
task langfuse:up
task langgraph-ts:up
task playground:dev

# build validations
task playground:build
cd pocs/runtimes/langgraph-typescript && npm run build
python3 -m py_compile pocs/runtimes/langgraph-python/src/app.py
cd pocs/runtimes/mastra && npm run build
```

URLs :

```txt
Playground    http://localhost:3013
Langfuse      http://localhost:3012
LangGraph TS  http://localhost:3014
Mastra        http://localhost:3009 / 4111 / 4112
LangGraph Py  http://localhost:3010 / 3011
MLflow        http://localhost:5001 / 3008
Phoenix       http://localhost:6006 / 3007
```

## 7. Décisions à prendre en séance

1. Est-ce que MLflow doit être câblé playground aujourd’hui ou rester non décisionnel ?
2. Est-ce que Phoenix vaut un adapter aujourd’hui ou est reporté ?
3. Est-ce que LangGraph TypeScript devient un vrai candidat runtime ou seulement un runtime de benchmark ?
4. Est-ce que prompt management est porté par la plateforme observability ou par un registry AnSu séparé ?
5. Quelle interface est acceptable pour Thomas/Mathieu/Jérémie : Langfuse, MLflow, Phoenix ou dashboard AnSu custom ?

## 8. Phrase de cadrage finale

```txt
On ne choisit pas l’outil qui a la meilleure démo.
On choisit la combinaison de briques qui passe le flux AnSu canonique,
reste observable, exportable, compréhensible, et ne capture pas le métier.
```
