# AnSu Benchmark Playground

Front étalon du benchmark agentique AnSu v2.

## Principe

Le benchmark ne compare plus des POC isolés. Il compare des briques branchées sur le même flux AnSu :

```txt
UI playground
  → runtime sélectionné
  → gateway/model LLM sélectionnés
  → réponse RuntimeResult normalisée
  → plateforme observability/evals sélectionnée
  → trace standardisée identifiable
```

Règle de validation :

```txt
seed isolé = preuve technique
intégration playground = preuve benchmark
```

## Runtimes disponibles

| Runtime | Statut | Endpoint utilisé |
|---|---|---|
| `fake` | Validé | local dans le playground |
| `mastra` | Adapter présent | `MASTRA_PLAYGROUND_API_URL` (`http://localhost:3009/api/agent`) |
| `langgraph-python` | Adapter présent | `LANGGRAPH_API_URL` (`http://localhost:3010/api/agent`) |
| `langgraph-typescript` | Validé | `LANGGRAPH_TS_API_URL` (`http://localhost:3014/api/agent`) |

## LLM gateways / models

Le playground permet de choisir indépendamment :

| Gateway | Exemples de modèle | Notes |
|---|---|---|
| `mock` | `deterministic-naive-agent` | Stable pour comparer les runtimes |
| `albert` | `albert-large` | Cible institutionnelle AnSu |
| `mistral` | `mistral-small-latest` | Fallback dev déjà utilisé dans les POC |
| `openai-compatible` | libre | Pour tester une gateway compatible OpenAI |

En mode `mock`, les runtimes reflètent le combo demandé sans appel LLM réel. En mode `real`, le combo est transmis au runtime et tracé ; si le runtime ne sait pas encore changer dynamiquement de provider, la trace doit permettre de distinguer `requestedModel` et modèle effectif.

## Plateformes observability/evals

| Plateforme | Statut playground | Notes |
|---|---|---|
| `none` | Validé | Aucun export trace |
| `langfuse` | Validé | Trace standardisée via SDK TS + OpenTelemetry |
| `mlflow` | À câbler | Le POC MLflow actuel reste une preuve technique via seed Python |
| `phoenix` | À câbler | Le POC Phoenix actuel reste une preuve technique via OpenInference Python |

## Identifiants obligatoires dans chaque trace

Toute trace envoyée par le playground doit permettre de filtrer/retrouver un tour AnSu avec :

| Champ | Exemple |
|---|---|
| `traceName` / nom root | `ansu.playground.agent_turn` |
| `ansuTraceSchema` | `ansu-playground-trace-v0.1.0` |
| `sessionId` | `preview-session-playground` |
| `userId` | `teacher-preview-demo` |
| `runtime` | `langgraph-typescript` |
| `observability` | `langfuse` |
| `runId` | `session:runtime:timestamp` |
| `agentId` | `agent-naif-ansu-langgraph-ts` |
| `agentVersion` | `langgraph-ts-poc-v0.1.0` |
| `promptVersion` | `naive-prompt-v0.1.0` |
| `llmGateway` | `mock`, `albert`, `mistral`, `openai-compatible` |
| `requestedModel` | `albert-large`, `mistral-small-latest` |
| `provider` | provider effectif ou simulé |
| `model` | modèle effectif ou simulé |
| `notion` | `la photosynthèse` |
| `score` | `ansu_naivety` |

Pour Langfuse, ces champs sont portés par le root `agent_turn` et dupliqués sur les observations standardisées (`moderation`, `naive_agent_llm`, `searchKnowledge`, `guardrail_score`).

## Lancement

Lancer les dépendances souhaitées, par exemple :

```bash
task langfuse:up
task langgraph-ts:up
task playground:dev
```

Puis ouvrir :

```txt
http://localhost:3013
```

## Scénario de smoke test validé

```txt
runtime       = langgraph-typescript
observability = langfuse
llm.gateway   = mistral
llm.model     = mistral-small-latest
message       = Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.
```

Résultat attendu :

- réponse agent naïf courte ;
- score `ansu_naivety = 1` ;
- trace Langfuse `ansu.playground.agent_turn` ;
- observations `agent_turn`, `moderation`, `naive_agent_llm`, `searchKnowledge`, `guardrail_score`.
