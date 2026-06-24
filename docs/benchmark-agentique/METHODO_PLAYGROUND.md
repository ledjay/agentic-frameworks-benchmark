# Méthodologie playground — benchmark AnSu v5

## Décision

Le benchmark AnSu v5 se base désormais sur un **front étalon unique** :

```txt
pocs/playground/
```

Le but est d'éviter de comparer des démonstrations hétérogènes. Chaque brique est testée sur le même flux utilisateur, le même contrat et les mêmes scénarios.

## Règle de validation

```txt
POC isolé = preuve technique
POC branché au playground = preuve benchmark
```

Un outil peut donc être prometteur sans être encore validé benchmark. Exemple : MLflow et Phoenix ont des seeds historiques utiles, mais leurs adapters playground restent à câbler.

## Architecture cible

```txt
pocs/
├── playground/                    # harness officiel
│   ├── src/contract/              # contrat commun
│   ├── src/runtime/               # adapters runtime
│   └── src/observability/         # adapters traces/evals
├── runtimes/
│   ├── mastra/
│   ├── langgraph-python/
│   └── langgraph-typescript/
└── observability/
    ├── langfuse/
    ├── mlflow/
    └── phoenix/
```

## Contrat fonctionnel

Chaque tour suit le même pipeline :

```txt
TurnRequest
  → RuntimeResult
  → TraceResult
  → TurnResponse
```

### `TurnRequest`

Contient :

- runtime sélectionné ;
- plateforme observability/evals sélectionnée ;
- gateway/model LLM demandés ;
- `sessionId`, `userId` ;
- message élève ;
- configuration prof.

### `RuntimeResult`

Doit contenir :

- `runId` ;
- `agentId`, `agentVersion`, `promptVersion` ;
- `provider`, `model` ;
- réponse agent ;
- score naïveté ;
- usage/coût/impact quand disponible.

### `TraceResult`

Doit contenir :

- plateforme ;
- statut : `sent`, `skipped`, `error` ;
- `traceId` si envoyé ;
- URL de consultation si disponible.

## Schéma d'identification trace

Toute trace envoyée par un adapter observability doit être retrouvable avec :

| Champ                                            | Raison                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| `traceName = ansu.playground.agent_turn`         | nom commun entre outils                            |
| `ansuTraceSchema = ansu-playground-trace-v0.1.0` | compatibilité et migrations futures                |
| `sessionId`                                      | retrouver une session AnSu                         |
| `userId`                                         | filtrage utilisateur pseudo/anonymisé              |
| `runtime`                                        | comparer fake/Mastra/LangGraph Python/LangGraph TS |
| `observability`                                  | identifier l'outil cible                           |
| `runId`                                          | idempotence et debug                               |
| `agentId`, `agentVersion`                        | version runtime/agent                              |
| `promptVersion`                                  | non-régression prompt                              |
| `llmGateway`, `requestedModel`                   | combo LLM demandé depuis le front                  |
| `provider`, `model`                              | provider/modèle effectifs ou simulés               |
| `notion`, `matiere`, `niveauScolaire`            | contexte pédagogique minimal                       |
| `ansu_naivety`                                   | score pédagogique principal                        |

## Spans standardisés

Le playground exporte la forme canonique :

```txt
ansu.playground.agent_turn
├─ moderation
├─ naive_agent_llm       (generation)
├─ searchKnowledge       (tool)
└─ guardrail_score
```

Chaque adapter doit préserver ces noms, ou les mapper explicitement dans la fiche de l'outil.

## Statut actuel

| Élément                        | Statut                                     |
| ------------------------------ | ------------------------------------------ |
| Playground UI                  | Build OK                                   |
| Runtime `fake`                 | Validé                                     |
| Runtime `langgraph-typescript` | Validé                                     |
| Runtime `mastra`               | Adapter présent, à revalider service lancé |
| Runtime `langgraph-python`     | Adapter présent, à revalider service lancé |
| Observability `langfuse`       | Validé avec trace réelle                   |
| Observability `mlflow`         | À câbler dans playground                   |
| Observability `phoenix`        | À câbler dans playground                   |

## Nettoyage des POC historiques

Les dashboards historiques restent utiles pour debug outil, mais ne sont plus la référence de benchmark :

```txt
pocs/runtimes/*/dashboard-next        = legacy/debug si présent
pocs/observability/*/dashboard-next   = legacy/debug si présent
```

La référence utilisateur est :

```txt
pocs/playground
```
