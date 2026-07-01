# LangGraph Python runtime exploration

POC LangGraph Python pour le benchmark runtime AnSu.

Décision benchmark : on teste **LangGraph open source + FastAPI custom**, pas Agent Server standalone.

Agent Server standalone est documenté par LangChain comme option officielle production, mais il demande une licence LangSmith/LangGraph (`LANGGRAPH_CLOUD_LICENSE_KEY`) et une infra Postgres/Redis. Il est donc hors périmètre du POC AnSu actuel.

## Fichiers principaux

- `src/a2_naive_agent.py` — A2 : graph minimal `START -> llm_call -> END`, Mistral, Langfuse callback.
- `src/api.py` — façade FastAPI canonique AnSu `POST /api/agent/turn` autour du graph.
- `src/a1_api.py` — wrapper de compatibilité pour les notes A1.

## Lancer A2 local

```bash
uv run python src/a2_naive_agent.py
```

## Tester la façade A1 sans serveur long-running

```bash
uv run python - <<'PY'
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)
print(client.get('/health').json())
print(client.post('/api/agent/turn', json={
    'message': "Explique-moi ce qu'est une équation du second degré.",
    'userId': 'benchmark-user',
    'sessionId': 'a1-test-session',
}).json())
PY
```

## Lancer la façade API en local

```bash
uv run uvicorn src.api:app --reload --port 3024
```

Routes :

- `GET /health`
- `POST /api/agent/turn`
- `GET /docs`

## Lecture benchmark

Pour le POC AnSu, la façade FastAPI custom est la voie proportionnée : elle garde un contrat API métier AnSu stable, évite d'exposer une API runtime générique, et reste compatible avec LangGraph open source sans dépendance commerciale LangSmith Deployment.

## Tester dans LangGraph Studio local

LangGraph fournit une interface de test/debug via **Studio** en mode développement local.

Docs : https://docs.langchain.com/langsmith/quick-start-studio.md

On utilise le serveur local in-memory fourni par `langgraph-cli[inmem]`. Ce n'est pas Agent Server standalone de production : pas de Postgres, pas de Redis, pas de licence LangGraph Cloud.

La configuration est dans :

```txt
langgraph.json
```

Commande :

```bash
uv run langgraph dev --no-browser
```

Sortie attendue :

```txt
API: http://127.0.0.1:2024
Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
Docs: http://127.0.0.1:2024/docs
```

Ouvre ensuite :

```txt
https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

Note privacy/dev : l'UI Studio est hébergée côté LangSmith, mais elle se connecte à ton serveur local. Le `.env` du POC définit `LANGSMITH_TRACING=false` pour éviter d'envoyer les traces à LangSmith en développement local. Si on veut une interface 100% locale, utiliser Swagger FastAPI (`/docs`) ou construire une mini UI maison.
