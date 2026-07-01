# Screenshots benchmark AnSu

Ce dossier contient les captures utilisées comme preuves visuelles dans les fiches d’évaluation.

## Règles

- Ne jamais capturer de donnée élève réelle.
- Ne jamais capturer de clé API, secret, token ou cookie.
- Utiliser des sessions synthétiques : `preview-*`, `benchmark-*`, `eval-*`.
- Une capture illustre une preuve ; elle ne remplace pas le `traceId`, l’URL, l’export ou le test local.

## Convention de nommage

```txt
YYYY-MM-DD__<question-id>__<outil>__<vue>__<combo>.png
```

Exemples :

```txt
2026-06-23__B3__langfuse__trace-tree__mastra-mistral.png
2026-06-23__B10__mlflow__prompt-registry__runtime-ref.png
2026-06-23__B13__phoenix__trace-ui__langgraph-python-mistral.png
```

## Intégration Markdown

```md
![B3 — Trace Langfuse lisible](./assets/screenshots/2026-06-23__B3__langfuse__trace-tree__mastra-mistral.png)
```

## Index des captures utilisées

### A2/A3 — Mastra agent et tools

| Outil | Vue | Fichier |
|---|---|---|
| Mastra Studio | Agent naïf et espace de debug tools | `2026-06-29__A2-A3__mastra-studio__naif-agent-and-tools.png` |

### A3 — LangGraph tool calling

| Outil | Vue | Fichier |
|---|---|---|
| LangGraph Studio | Graph `a3_tool_agent` avec boucle modèle → tool → modèle | `2026-06-30__A3__langgraph-studio__tool-agent-graph.png` |
| Langfuse | Trace LangGraph A3 avec tool call | `2026-06-30__A3__langfuse__langgraph-tool-call-trace.png` |

### A6/A8 — Traces Mastra et versions

| Outil | Vue | Fichier |
|---|---|---|
| Langfuse | Trace Mastra avec metadata runtime/version | `2026-06-29__A6-A8__langfuse__mastra-trace-metadata.png` |

### A5 — Workflows / graphes non linéaires

| Runtime | Outil | Vue | Fichier |
|---|---|---|---|
| Mastra | Mastra Studio | Workflow `guide-workflow` avec branches | `2026-06-29__A5__mastra-studio__guide-workflow.png` |
| Mastra | Langfuse | Trace du workflow `guide-workflow` | `2026-06-29__A5__langfuse__mastra-guide-workflow-trace.png` |
| LangGraph | LangGraph Studio | Graph `a5_router_agent` avec trois branches | `2026-06-30__A5__langgraph-studio__router-graph.png` |
| LangGraph | Langfuse | Trace A5 montrant le chemin exécuté | `2026-06-30__A5__langfuse__langgraph-router-trace.png` |

### B3 — Traces agentiques

| Outil | Vue | Fichier |
|---|---|---|
| MLflow | Liste des traces | `2026-06-23__B3__mlflow__traces-list__langgraph-python-mistral.png` |
| MLflow | Détail d’une trace | `2026-06-23__B3__mlflow__trace-detail__langgraph-python-mistral.png` |
| Phoenix | Liste des traces | `2026-06-23__B3__phoenix__traces-list__langgraph-python-mistral.png` |
| Phoenix | Détail d’une trace | `2026-06-23__B3__phoenix__trace-detail__langgraph-python-mistral.png` |
| Langfuse | Liste des traces | `2026-06-23__B3__langfuse__traces-list__langgraph-python-mistral.png` |
| Langfuse | Détail d’une trace | `2026-06-23__B3__langfuse__trace-detail__langgraph-python-mistral.png` |
