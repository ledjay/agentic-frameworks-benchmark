# Phoenix + LangChain demo

Objectif : tester **Arize Phoenix** comme socle d'observabilité/evals LLM pour AnSu v2, branché sur une app **LangChain** minimale.

Hypothèse : Phoenix n'est pas le framework agentique principal. C'est plutôt une brique transverse : traces, datasets, experiments, evals, prompt management.

## Lancement Docker recommandé

Depuis la racine du benchmark :

```bash
task phoenix:up
task phoenix:seed
```

URLs :

```txt
Phoenix UI        http://localhost:6006
Phoenix dashboard http://localhost:3007
```

Autres commandes :

```bash
task phoenix:logs
task phoenix:down
task phoenix:clean
```

Le service `phoenix-app` est un job ponctuel : il génère une trace puis s'arrête.

## Ce que démontre ce dossier

- Phoenix self-hosté localement via Docker.
- Ingestion de traces OpenTelemetry OTLP HTTP sur `/v1/traces`.
- Instrumentation LangChain via OpenInference.
- Spans custom pour :
  - agent turn,
  - modération input,
  - retrieval,
  - modération output,
  - évaluation simple.
- Provider LLM configurable :
  - Mistral si `MISTRAL_API_KEY` est présent,
  - OpenAI si `OPENAI_API_KEY` est présent,
  - fake model déterministe sinon.
- Préparation du câblage Grafana/Tempo via `otel-collector.example.yaml`.

## Lancer Phoenix

```bash
cd phoenix-langchain
docker compose up -d
open http://localhost:6006
```

Phoenix expose :

- UI + OTLP HTTP : `http://localhost:6006`
- traces OTLP HTTP : `http://localhost:6006/v1/traces`
- traces OTLP gRPC : `localhost:4317`
- métriques Prometheus Phoenix : `http://localhost:9090/metrics`

## Lancer la démo LangChain

```bash
cd phoenix-langchain
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

Puis aller dans Phoenix UI > traces / projects et chercher le projet `ansu-phoenix-langchain-demo`.

## Tester avec Mistral

```bash
export MISTRAL_API_KEY=...
export MISTRAL_MODEL=mistral-small-latest
python app.py
```

## Tester avec OpenAI

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4o-mini
python app.py
```

## Grafana / Tempo

Pour AnSu, l'option propre en prod serait probablement :

```text
app LangChain/agent -> OpenTelemetry Collector -> Phoenix + Grafana Tempo
```

Le fichier `otel-collector.example.yaml` montre le fan-out : un exporter vers Phoenix, un exporter vers Tempo.

À vérifier avec Thomas : conventions de déploiement, réseau Docker/Kubernetes, stockage, rétention et exposition Prometheus.

## Arrêter

```bash
docker compose down
```
