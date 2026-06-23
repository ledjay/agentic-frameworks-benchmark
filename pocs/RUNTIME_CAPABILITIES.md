# Runtime capabilities canoniques — AnSu benchmark

Tous les runtimes comparés dans le playground doivent exposer le même agent naïf AnSu. Le benchmark doit comparer les moteurs, pas des agents différents.

## Pipeline agent attendu

```txt
moderate_input
  → retrieve_context / searchKnowledge
  → generate_answer
  → score_naivety
```

## Comportement déterministe attendu en mode mock

| Condition input | Réponse attendue |
|---|---|
| Message > 800 caractères | `Ton message est trop long pour l’atelier. Peux-tu le raccourcir en une ou deux phrases ?` |
| Demande de réponse directe | `Je ne peux pas te donner la réponse. Qu’est-ce que tu crois déjà comprendre avec tes mots ?` |
| Confusion “mange la lumière” | `Quand tu dis que la plante “mange” la lumière, qu’est-ce que tu imagines exactement ?` |
| Autre message | `Tu parles de {notion} : qu’est-ce qui te fait penser ça, et comment tu pourrais le vérifier ?` |

## Score naïveté commun

Chaque runtime doit aussi respecter le combo `llm.gateway/model` fourni dans `TurnRequest` :

- en mode `mock`, `provider` et `model` reflètent directement ce combo ;
- en mode `real`, le runtime peut utiliser sa config effective, mais doit tracer `requestedLlmGateway` et `requestedModel` si le changement dynamique n’est pas supporté.

Chaque runtime doit retourner :

```json
{
  "score": 1,
  "passed": true,
  "reason": "L’agent relance sans donner la réponse experte.",
  "scorerVersion": "naivety-contract-v0.1.0",
  "guardrails": {
    "directAnswerRefusal": true,
    "expertAnswerRisk": false,
    "repairApplied": false,
    "asksAnswerDirectly": true
  }
}
```

`score=0` uniquement si la réponse contient un risque de réponse experte directe (`la photosynthèse est`, `voici la réponse`, etc.).

## Debug raw commun

Chaque runtime doit exposer dans `output.raw` :

```json
{
  "graph": ["moderate_input", "retrieve_context", "generate_answer", "score_naivety"],
  "guardrail": { "allowed": true, "asksAnswerDirectly": false, "tooLong": false, "reason": "ok" },
  "toolCalls": [{ "name": "searchKnowledge", "args": { "notion": "la photosynthèse" } }],
  "toolResults": [{ "id": "svt-photosynthese-lumiere-v0", "title": "Indice photosynthèse — rôle de la lumière" }]
}
```

## Usage simulé commun

En mode mock, si le provider ne fournit pas de métriques réelles :

```json
{
  "inputTokens": 126,
  "outputTokens": "round(answer.length / 4), minimum 18",
  "totalTokens": "input + output",
  "cost": 0.00111,
  "impacts": { "kWh": 0.00011, "kgCO2eq": 0.000041 }
}
```

## Runtimes concernés

| Runtime | Mode mock harmonisé | Notes |
|---|---|---|
| `fake` | Oui | Implémenté dans le playground |
| `mastra` | Oui | Endpoint Next `/api/agent` |
| `langgraph-python` | Oui | FastAPI `/api/agent` |
| `langgraph-typescript` | Oui | Node/LangGraph.js `/api/agent` |
