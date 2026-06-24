# POC benchmark AnSu

Ce dossier regroupe les preuves techniques du benchmark agentique AnSu v5.

## Méthode actuelle

La référence de benchmark est désormais le playground commun :

```txt
pocs/playground/
```

Règle :

```txt
seed isolé = preuve technique
intégration playground = preuve benchmark
```

Le playground permet de tester la matrice :

```txt
runtime × observability/evals × llm gateway × model
```

## Structure

```txt
pocs/
├── playground/                    # front/harness officiel
├── RUNTIME_CAPABILITIES.md         # comportement agent canonique entre runtimes
├── runtimes/
│   ├── mastra/                     # runtime Mastra + dashboard legacy/debug
│   ├── langgraph-python/           # runtime LangGraph Python + dashboard legacy/debug
│   └── langgraph-typescript/       # runtime LangGraph.js backend-only
└── observability/
    ├── langfuse/                   # self-host + adapter playground validé
    ├── mlflow/                     # preuve technique, adapter playground à câbler
    └── phoenix/                    # preuve technique, adapter playground à câbler
```

## Commandes principales

```bash
task langfuse:up
task langgraph-ts:up
task playground:dev
```

Puis ouvrir :

```txt
http://localhost:3013
```

## Statut playground

| Dimension         | Valeurs                                          | Statut                                       |
| ----------------- | ------------------------------------------------ | -------------------------------------------- |
| Runtime           | `fake`                                           | Validé                                       |
| Runtime           | `langgraph-typescript`                           | Validé                                       |
| Runtime           | `mastra`                                         | Adapter présent, à revalider service lancé   |
| Runtime           | `langgraph-python`                               | Adapter présent, à revalider service lancé   |
| Observability     | `langfuse`                                       | Validé trace réelle                          |
| Observability     | `mlflow`                                         | À câbler                                     |
| Observability     | `phoenix`                                        | À câbler                                     |
| LLM gateway/model | `mock`, `albert`, `mistral`, `openai-compatible` | Sélecteur validé ; propagation trace validée |

## Dashboards historiques

Les dashboards propres à certains POC restent utiles pour debug outil, mais ne sont plus la référence de comparaison produit.
