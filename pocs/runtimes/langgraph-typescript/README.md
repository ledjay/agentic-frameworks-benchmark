# LangGraph TypeScript Runtime POC

Runtime backend LangGraph.js minimal pour le benchmark AnSu v5.

## Rôle

Ce POC n'a pas de front dédié. Il expose un contrat API compatible avec `pocs/playground` :

```txt
GET  /health
POST /api/agent
```

Le graphe TypeScript est volontairement simple pour tester la DX LangGraph.js et l'intégration au harness commun :

```txt
moderate_input → retrieve_context → generate_answer → score_naivety
```

## Lancement

Depuis la racine :

```bash
task langgraph-ts:up
```

URL :

```txt
http://localhost:3014
```

## Contrat trace

Le runtime retourne les identifiants normalisés qui seront propagés par le playground dans les plateformes observability/evals :

- `runId`
- `agentId`
- `agentVersion`
- `promptVersion`
- `provider`
- `model`
- `score.score`
- `usage.cost`
- `usage.impacts`
