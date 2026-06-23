# MLflow — Observability / evals AnSu v2

> Statut : repassé après réorganisation POC, juin 2026. POC historique relancé avec succès via `task mlflow:seed` et `task mlflow:eval`.

## 1. Cadrage

MLflow est évalué comme brique **observability / evals / prompt registry / experiment tracking**, pas comme runtime agentique.

Rôle probable pour AnSu :

```txt
MLflow = AI engineering / experiment tracking / trace-based evals / prompt registry / preuve d’impact
```

MLflow ne doit pas être considéré comme :

```txt
MLflow ≠ runtime agentique
MLflow ≠ registry métier AnSu complet
MLflow ≠ dashboard prof final
```

## 2. POC relancé

Chemin POC :

```txt
pocs/observability/mlflow/
```

Commandes relancées après migration des POC :

```bash
task mlflow:up
task mlflow:seed
task mlflow:eval
```

Résultats :

- serveur MLflow : `http://localhost:5001` — OK ;
- dashboard Next AnSu : `http://localhost:3008` — OK ;
- routes dashboard testées : `/`, `/traces`, `/prompts`, `/evals`, `/research` — HTTP 200 ;
- seed : prompt registry + 2 traces agent naïf — OK ;
- eval : `mlflow.genai.evaluate` sur traces collectées — OK ;
- métrique observée : `no_expert_answer/mean = 1.0`.

## 3. Réponses aux questions B

| ID | Question | Réponse MLflow | Statut | Preuves / notes |
|---|---|---|---|---|
| B1 | Self-host / souveraineté | Oui. MLflow OSS self-host local, Docker, backend SQLite dans le POC ; trajectoire SQL + artifact store. Licence Apache-2.0 favorable. Auth/sécurité prod à cadrer. | Validé POC / prod à cadrer | `docker-compose.yml`, serveur local `5001`, licence Apache-2.0 |
| B2 | Compatibilité runtime Mastra / LangGraph | Très bon côté Python/LangChain via SDK Python et instrumentation manuelle. Côté Mastra/TS, pas de SDK GenAI TS validé ; intégration probable via REST/OTLP ou backend Python/BFF. | Python validé / TS à qualifier | POC Python fake agent ; dashboard Next utilise REST + bridge Python |
| B3 | Tracing agentique | Oui pour traces et spans imbriqués : agent, moderation/guardrail, retriever, LLM fake, evaluator. Moins orienté “agent timeline UX” que LangSmith/Phoenix mais exploitable. | Validé POC | `@mlflow.trace`, `/api/3.0/mlflow/traces/search`, `/batchGet` |
| B4 | Scores / evals | Très fort. Trace-based evaluation validée sans rejouer le modèle. Scorer custom `no_expert_answer` exécuté sur traces collectées. | Validé POC | `task mlflow:eval`, `no_expert_answer/mean = 1.0` |
| B5 | Structured output | Possible via inputs/outputs/metadata JSON des traces et runs. Pas encore testé avec un vrai `NotionAssessment`/guardrail schema AnSu. | Partiel | Réponses agent + evaluation dict visibles ; structured assessment à tester si MLflow shortlist |
| B6 | Coût / tokens / impact Albert | Non testé dans MLflow. MLflow peut stocker metadata/tags/metrics, mais visibilité/filtrage UI des champs Albert custom (`usage.cost`, `impacts`) reste à vérifier. | À tester | Critère bloquant pour shortlist finale observability |
| B7 | Prompt / agent versioning | Prompt Registry OSS validé. Templates `{{variable}}`, versions, prompt variables extraites via `PromptVersion.variables`. Mais schema métier variable/prof doit rester côté AnSu. | Validé POC / limites métier | `mlflow.genai.register_prompt`, `load_prompt().variables` |
| B8 | Données produit vs observability | MLflow doit rester outil d’observation/éval/recherche, pas source de vérité métier. Session, classe, consentement, posture, séquence et traces élèves canonicales doivent rester dans AnSu DB. | Clair | Pattern recommandé : `AnSu backend/BFF → MLflow SDK/REST` |
| B9 | DX | Bonne DX Python pour ML/data/AI engineering. UI dense, MLOps/Data plutôt que produit. REST utilisable mais SDK Python plus naturel pour GenAI moderne. DX TS faible/non validée. | Python bon / TS faible | Dashboard Next nécessite bridge Python pour prompts |
| B10 | Prod readiness | Maturité forte MLflow, mais serveur OSS à sécuriser : auth, RBAC, proxy, rétention PII, backups, artifact store, migrations. | À cadrer | Pas évalué prod dans ce benchmark |
| B-TS | LangGraph/LangChain TypeScript | Pas de test LangGraph TS MLflow réalisé. Hypothèse : pas de SDK TS GenAI MLflow équivalent au SDK Python ; intégration TS passerait par OTLP ou REST, donc moins naturelle. | Non validé / malus DX TS | À tester seulement si MLflow reste candidat sérieux |

## 4. Points forts

- Licence Apache-2.0, self-hostable.
- Très bon fit pour **evals**, non-régression et preuve d’impact.
- `mlflow.genai.evaluate` permet d’évaluer des traces déjà collectées sans rejouer le modèle.
- Prompt Registry OSS plus convaincant que Phoenix sur ce POC : templates string + variables extraites.
- Écosystème MLOps mature : experiments, runs, metrics, artifacts, datasets, DataFrames.
- Bon candidat pour partenariat recherche / mesure scientifique.

## 5. Limites

- Pas runtime agentique.
- UI MLflow très data/ML, pas pensée comme dashboard produit/prof.
- SDK Python dominant ; TypeScript/Mastra moins naturel.
- Certaines fonctionnalités GenAI avancées semblent Databricks-only ou expérimentales.
- Coûts/impacts Albert non testés : stockage possible, mais exploitabilité UI/filtre/export à vérifier.
- Auth/RBAC/sécurité prod OSS à cadrer sérieusement pour données élèves.

## 6. Verdict provisoire

```txt
MLflow = très bon candidat evals / experiment tracking / preuve d’impact,
mais candidat plus faible comme observability runtime agentique transversale
si la stack produit reste fortement TypeScript/Mastra.
```

Décision provisoire :

- **À garder comme candidat “evals/recherche/proof of impact”** ;
- **À challenger fortement** sur observability runtime, UX trace agentique et DX TypeScript ;
- **Ne pas en faire la source de vérité métier AnSu** ;
- **Ne pas le départager définitivement avant Langfuse et Phoenix**.

## 7. Tests restants si MLflow reste en shortlist

- Envoyer une trace avec vrais champs Albert : tokens, `usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq`.
- Vérifier filtrage/affichage/export de ces champs dans UI/API.
- Tester un vrai structured output `NotionAssessment`.
- Tester ingestion OTLP depuis TypeScript / LangGraph.js minimal.
- Clarifier sécurité prod OSS : auth, RBAC, rétention, anonymisation, suppression données élève.
