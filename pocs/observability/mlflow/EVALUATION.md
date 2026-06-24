# Évaluation MLflow pour AnSu v5

> **Statut : POC historique.** Ce document ne vaut pas validation dans la nouvelle grille observability/evals. MLflow doit être repassé avec `docs/benchmark-agentique/TRACES_PRIORITAIRES.md`.

## Résumé

MLflow est un candidat sérieux comme brique **AI engineering / tracing / evals / prompt registry**. Il est plus large et plus mature côté MLOps que Phoenix, avec une licence Apache-2.0 favorable et un très fort écosystème.

En revanche, comme Phoenix, MLflow ne remplace pas un runtime agentique ni la couche métier AnSu. Il observe, évalue, versionne des prompts et structure des expériences, mais ne porte pas naturellement les agrégats AnSu : posture, séquence, atelier, contrat didactique, agent naïf publié.

## POC réalisé

- Serveur MLflow local sur `http://127.0.0.1:5001`
- Backend SQLite : `mlflow.db`
- Artifact store local : `./artifacts`
- App Python fake agent naïf sans clé LLM
- Instrumentation `@mlflow.trace`
- Metadata session/user
- Spans : agent, guardrail, retriever, LLM fake, evaluator
- Prompt registry : création d'un prompt master avec variables `{{niveau_scolaire}}`, `{{matiere}}`, `{{notion}}`
- Évaluation trace-based avec scorer custom `no_expert_answer`

## Commandes

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
python eval_traces.py
```

## Points forts observés

- Setup local très simple.
- Licence Apache-2.0.
- OpenTelemetry-compatible.
- Prompt registry OSS disponible, avec templates string et chat.
- Variables de prompt en `{{variable}}` supportées dans le template.
- Trace-based evaluation très convaincante : on peut évaluer les traces collectées sans rejouer le modèle.
- Scorers custom simples.
- Sessions multi-turn supportées via metadata standard `mlflow.trace.session`.
- SDK Python très riche.
- Stockage self-host avec SQLite local ou backend SQL / artifacts store.
- Dashboard Next expérimental câblé sur `http://localhost:3008`.
- `PromptVersion.variables` expose les variables extraites du template (`niveau_scolaire`, `matiere`, `notion`).

## Limites observées ou à vérifier

- MLflow est une plateforme large : dépendances Python lourdes pour le package complet.
- Plusieurs fonctionnalités GenAI avancées sont expérimentales ou Databricks-only : Review App, Labeling Sessions, certains agents/configs.
- La notion `mlflow.genai.Agent` documentée est liée à Databricks, pas un runtime agentique OSS complet.
- UI et API héritent d'une logique MLOps : très puissant pour tech/data, probablement pas adapté comme UI produit pour profs.
- La surface REST existe, mais pour GenAI le SDK Python semble plus naturel que REST direct depuis Next. Une façade backend AnSu est recommandée.
- Prompt registry utilise les tables de Model Registry (`registered_models`, `model_versions`), ce qui est puissant mais peut être conceptuellement moins lisible pour des non-ML engineers.
- Auth/sécurité production du serveur open source à vérifier sérieusement.

## Routes API observées

| Besoin                    | Route / méthode                                               | Statut                      |
| ------------------------- | ------------------------------------------------------------- | --------------------------- |
| UI MLflow                 | `/`                                                           | OK                          |
| UI Gateway                | `/#/gateway`                                                  | Visible                     |
| Experiments               | `POST /api/2.0/mlflow/experiments/search`                     | OK                          |
| Runs                      | `POST /api/2.0/mlflow/runs/search`                            | OK                          |
| Traces GenAI              | `POST /api/3.0/mlflow/traces/search`                          | OK                          |
| OTLP ingest               | `POST /v1/traces` avec header `x-mlflow-experiment-id`        | À tester avec collector     |
| Gateway OpenAI-compatible | `/gateway/mlflow/v1/...`                                      | Documenté, pas encore testé |
| Prompt Registry           | SDK `mlflow.genai.register_prompt/search_prompts/load_prompt` | OK                          |

## Dashboard Next expérimental

Chemin :

```txt
dashboard-next/
```

Lancement :

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

Implémentation :

- REST MLflow pour experiments/runs.
- REST MLflow pour traces/research via `/api/3.0/mlflow/traces/search` et `/api/3.0/mlflow/traces/batchGet`.
- BFF Python SDK seulement pour le Prompt Registry via `scripts/mlflow_bridge.py`.

Cette interface confirme qu'une façade Next est possible. Pour éviter les pages SSR lentes, les traces passent par REST direct ; le SDK Python reste utile pour les zones moins exposées côté REST, comme le Prompt Registry.

## Implication AnSu

MLflow est très intéressant pour :

- preuve d'impact ;
- recherche ;
- datasets/evals ;
- non-régression de la naïveté ;
- prompt registry ;
- observabilité GenAI vendor-neutral.

MLflow ne suffit pas seul pour :

- exécuter l'agent naïf ;
- gérer la posture comme policy métier ;
- gérer les séquences/ateliers/classes ;
- fournir le configurateur prof ;
- porter le dashboard prof final.
