# Synthèse observability / evals — AnSu v2

> Statut : en cours. Ordre de passe validé : **MLflow → Langfuse → Phoenix**. Les POC servent à choisir une brique d’observability/evals, pas un runtime agentique.

## 1. Besoin AnSu

Pour le POC octobre, la brique observability/evals doit permettre de comprendre et mesurer un agent naïf unique :

```txt
agent_turn
  moderation
  naive_agent_llm
  searchKnowledge tool
  guardrail_score
  final_response
```

Metadata importantes :

- `sessionId`, `userId` anonymisé/pseudonymisé ;
- `agentVersion`, `promptVersion` ;
- provider / model ;
- tokens ;
- coût et impact Albert : `usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq` ;
- score pédagogique : `ansu_naivety` ;
- structured outputs : moderation, guardrail, assessment.

## 2. Ce que l’outil ne doit pas devenir

La source de vérité métier doit rester AnSu/Postgres :

- classes, ateliers, séquences ;
- configuration prof ;
- posture et garde-fous publiés ;
- consentements / PII / rétention ;
- sessions/messages canoniques ;
- exports chercheurs validés.

L’outil observability peut stocker des copies techniques utiles, mais ne doit pas devenir le registry métier AnSu.

## 3. Grille courte B

| ID | Critère | Question |
|---|---|---|
| B1 | Self-host / souveraineté | Peut-on l’héberger proprement sur infra maîtrisée ? Licence compatible ? |
| B2 | Intégrations runtime | Python, TypeScript, LangChain/LangGraph, Mastra, instrumentation manuelle ? |
| B3 | Traces agentiques | Trace hiérarchique lisible par tour/session avec spans agent/tool/guardrail ? |
| B4 | Scores / evals | Scores custom, LLM-as-judge, datasets, replay/non-régression ? |
| B5 | Structured outputs | Peut-on stocker/filtrer/exporter les JSON métier ? |
| B6 | Albert coûts/impacts | Peut-on tracer tokens, coûts, impacts kWh/kgCO2eq et les exploiter ? |
| B7 | Prompt/versioning | Prompt registry, versions, tags, variables ? |
| B8 | Portabilité | Export, API, séparation source de vérité AnSu vs outil ? |
| B9 | DX | Câblage clair local/prod, Python, TypeScript, UI utile ? |
| B10 | Prod readiness | Auth, RBAC, multi-projet, backup, performance, rétention ? |

## 4. État des fiches

| Outil | Fiche | Statut | Verdict provisoire |
|---|---|---|---|
| MLflow | `fiches/observability/mlflow.md` | Repassé POC | Très fort evals/recherche/proof of impact ; plus faible côté observability runtime TS |
| Langfuse | `fiches/observability/langfuse.md` | POC TS validé | Très fort observability agentique + DX TypeScript ; infra plus lourde |
| Phoenix | À créer / consolider depuis POC | Ensuite | À comparer à MLflow/Langfuse avec même grille |

## 5. MLflow — conclusion provisoire

MLflow est un excellent candidat pour :

- trace-based eval ;
- experiment tracking ;
- prompt registry ;
- non-régression de la naïveté ;
- preuve d’impact et usage recherche.

POC relancé avec succès après réorganisation :

```bash
task mlflow:up
task mlflow:seed
task mlflow:eval
```

Résultats :

- dashboard Next OK ;
- traces et runs OK ;
- prompt registry OK ;
- eval `no_expert_answer/mean = 1.0`.

Limite principale pour AnSu : MLflow est très Python/MLOps. Pour une stack produit TypeScript/Mastra, l’intégration observability runtime semble moins naturelle qu’un outil LLM-observability conçu avec SDK TS/OTel/HTTP en première classe.

Verdict provisoire :

```txt
MLflow = candidat fort pour evals/recherche,
mais pas encore favori pour observability agentique produit.
```


## 6. Langfuse — conclusion provisoire

Langfuse est un excellent candidat pour :

- observability agentique produit ;
- tracing TypeScript/OpenTelemetry ;
- traces hiérarchiques avec observations `SPAN`, `GENERATION`, `TOOL` ;
- scores simples via SDK/API ;
- usage/cost natifs sur générations ;
- intégration probable avec Mastra ou LangGraph.js.

POC créé et validé :

```bash
task langfuse:up
task langfuse:seed
```

Résultats ClickHouse :

```txt
traces       = 1
observations = 5
scores       = 4
```

Trace validée :

```txt
ansu.agent_turn
├─ moderation
├─ naive_agent_llm       (GENERATION)
├─ searchKnowledge       (TOOL)
└─ guardrail_score
```

Limite principale : stack self-host plus lourde que MLflow/Phoenix. Le Docker Compose est très utile pour POC, mais la documentation Langfuse recommande Kubernetes/Helm pour HA/high-throughput.

Verdict provisoire :

```txt
Langfuse = candidat très fort pour observability agentique produit,
surtout si runtime principal TypeScript/Mastra.
```

## 7. Question LangGraph TypeScript

Pour chaque outil, on doit qualifier la compatibilité avec LangGraph/LangChain TypeScript, mais sans refaire le benchmark runtime A1-A13.

Objectif du test TS :

```txt
Est-ce qu’un agent LangGraph.js peut pousser une trace exploitable dans l’outil ?
```

Niveau de test suffisant :

- un mini tour agent fake ou LLM mock ;
- spans : moderation, llm, tool, score ;
- metadata AnSu ;
- score naïveté ;
- éventuellement usage Albert simulé.

Pour MLflow, la piste la plus probable est :

```txt
LangGraph TS → OpenTelemetry/OTLP ou REST → MLflow
```

plutôt qu’un SDK TypeScript MLflow GenAI natif. Cela crée un malus DX par rapport à un outil qui proposerait une intégration TS directe.

## 8. Prochaine étape

Repasser **Phoenix** avec la même grille :

- vérifier le POC après réorganisation ;
- formaliser la fiche `fiches/observability/phoenix.md` ;
- comparer Phoenix à MLflow/Langfuse sur B1-B10 ;
- insister sur prompt registry, evals, structured outputs et coûts/impacts Albert.
