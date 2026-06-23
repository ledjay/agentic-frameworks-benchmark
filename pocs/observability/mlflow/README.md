# MLflow GenAI POC pour AnSu

POC minimal pour évaluer MLflow comme brique de tracing/evals/prompt registry dans le benchmark AnSu.

## Lancement Docker recommandé

Depuis la racine du benchmark :

```bash
task mlflow:up
task mlflow:seed
task mlflow:eval
```

URLs :

```txt
MLflow UI        http://localhost:5001
MLflow dashboard http://localhost:3008
```

Autres commandes :

```bash
task mlflow:logs
task mlflow:down
task mlflow:clean
```

Les services `mlflow-app` et `mlflow-eval` sont des jobs ponctuels : ils génèrent les traces/prompts et les évaluations, puis s'arrêtent.

## Lancer

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mlflow server \
  --host 127.0.0.1 \
  --port 5001 \
  --backend-store-uri sqlite:///mlflow.db \
  --default-artifact-root ./artifacts
```

Dans un autre terminal :

```bash
source .venv/bin/activate
MLFLOW_TRACKING_URI=http://127.0.0.1:5001 python app.py
```

UI : http://127.0.0.1:5001

## Objectif

Tester :

- tracing GenAI avec `@mlflow.trace` ;
- session/user metadata ;
- spans agent / guardrail / retriever / evaluator ;
- logging d'une évaluation de non-dérive ;
- prompt registry si disponible ;
- limites pour AnSu : runtime agent vs observabilité/evals.

## Dashboard Next expérimental

Un mini dashboard Next.js a été ajouté dans `dashboard-next/` pour tester une façade AnSu au-dessus de MLflow.

```bash
cd dashboard-next
npm install
cp .env.example .env.local
npm run dev
```

URL :

```txt
http://localhost:3008
```

Pages :

- `/` : vue d'ensemble de l'expérience MLflow.
- `/traces` : liste des traces agent.
- `/traces/:traceId` : détail request/response/metadata/spans.
- `/prompts` : prompt registry MLflow, avec variables extraites.
- `/evals` : runs et scores d'évaluation.
- `/research` : indicateurs POC de preuve d'impact.

Implementation :

- REST MLflow pour experiments/runs : `/api/2.0/mlflow/...`
- REST MLflow pour traces/research : `/api/3.0/mlflow/traces/search` et `/api/3.0/mlflow/traces/batchGet`
- BFF Python SDK pour Prompt Registry via `scripts/mlflow_bridge.py`
- Route REST traces observée : `POST /api/3.0/mlflow/traces/search`

Découverte utile : `mlflow.genai.load_prompt()` expose une propriété `variables` qui extrait les trous du prompt (`niveau_scolaire`, `matiere`, `notion`). Cela ne remplace pas le schema métier AnSu, mais c'est un meilleur support natif que Phoenix REST sur ce point.
