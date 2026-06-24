# Langfuse — Observability / evals AnSu v5

> Statut : POC créé et validé, juin 2026. Stack self-host Langfuse v3.194.1 lancée en Docker Compose ; seed TypeScript validé via SDK Langfuse v5.

## 1. Cadrage

Langfuse est évalué comme brique **LLM observability / evals / prompt management / datasets**, avec un intérêt particulier pour la compatibilité TypeScript/Mastra/LangGraph.js.

Rôle probable pour AnSu :

```txt
Langfuse = observability agentique produit + scores + prompt/dataset/evals
```

Langfuse ne doit pas devenir :

```txt
Langfuse ≠ runtime agentique
Langfuse ≠ source de vérité métier AnSu
Langfuse ≠ dashboard prof final
```

## 2. POC créé

Chemin :

```txt
pocs/observability/langfuse/
```

Stack self-host issue du compose officiel Langfuse, adaptée aux ports locaux AnSu :

- Langfuse web : `http://localhost:3012` ;
- worker : `http://localhost:3032/api/health` ;
- Postgres : `5433` ;
- ClickHouse : `8124` / `9001` ;
- Redis : `6380` ;
- MinIO : `9010` / `9011`.

Commandes :

```bash
task langfuse:up
task langfuse:seed
```

Seed TypeScript :

```txt
pocs/observability/langfuse/scripts/seed.mjs
```

Il crée une trace AnSu :

```txt
agent_turn
├─ moderation
├─ naive_agent_llm       (GENERATION)
├─ searchKnowledge       (TOOL)
└─ guardrail_score
```

Validation ClickHouse après seed :

```txt
traces       = 1
observations = 5
scores       = 4
```

Les 4 scores viennent de deux runs : la première tentative a créé des scores avant que la trace ne passe ; Langfuse documente que les scores peuvent précéder une trace et se rattacher ensuite si l’id apparaît.

Trace validée :

```txt
trace_id   = 52fdd564196ec2ba3fa806121093a783
name       = ansu.agent_turn
session_id = preview-session-langfuse-poc
user_id    = teacher-preview-demo
```

## 3. Réponses aux questions B

| ID   | Question                                 | Réponse Langfuse                                                                                                                                                       | Statut                                   | Preuves / notes                                                          |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| B1   | Self-host / souveraineté                 | Oui, OSS self-host Docker/K8s. Stack plus lourde que MLflow/Phoenix : web + worker + Postgres + ClickHouse + Redis + S3/MinIO.                                         | Validé POC local                         | Compose officiel adapté ; health OK en v3.194.1                          |
| B2   | Compatibilité runtime Mastra / LangGraph | Très bon côté TS : SDK JS/TS v5, OpenTelemetry, `@langfuse/tracing`, `@langfuse/otel`, `@langfuse/client`. Bon potentiel Mastra/LangGraph.js. Python aussi disponible. | Validé smoke TS                          | Seed Node/TS sans runtime agent réel, mais forme LangGraph.js compatible |
| B3   | Tracing agentique                        | Très bon. Observations typées `SPAN`, `GENERATION`, `TOOL`; hiérarchie agent/tool/guardrail lisible ; session/user/version propagés.                                   | Validé POC                               | 1 trace + 5 observations dans ClickHouse                                 |
| B4   | Scores / evals                           | Bon. Scores Numeric/Boolean/Text/Categorical via SDK/API ; scores trace/session/observation. Evals/datasets/code evaluators existent, pas encore testés.               | Scores validés / evals avancées à tester | `ansu_naivety=1`, `drift_detected=0`                                     |
| B5   | Structured output                        | Bon. Inputs/outputs JSON stockés ; metadata map stringifiée. Attention : metadata propagée doit être string-compatible ; objets imbriqués à JSON.stringify.            | Validé avec nuance                       | Warning initial sur `metadata.impacts` objet, corrigé en string JSON     |
| B6   | Albert coûts/impacts                     | Bon potentiel. `usageDetails` et `costDetails` sont champs natifs sur `GENERATION`; impacts Albert stockés en metadata JSON string.                                    | Validé partiel                           | Usage/cost visibles en colonnes dédiées ; impact en metadata             |
| B7   | Prompt / agent versioning                | Langfuse a prompt management natif et SDK/client, mais non testé dans ce POC minimal. Version/promptVersion stockés en metadata.                                       | À tester                                 | Prioritaire avant verdict final                                          |
| B8   | Données produit vs observability         | Langfuse doit rester miroir observability ; AnSu DB reste source de vérité. Le modèle session/user/trace convient bien aux copies techniques.                          | Clair                                    | Même pattern que MLflow : backend/BFF AnSu gouverne PII/droits           |
| B9   | DX                                       | Très bonne DX TypeScript pour tracing. Setup self-host plus lourd ; premier run demande ressources/migrations. SDK v5 exige OTel mental model mais reste propre.       | Bon TS / infra lourde                    | `npm install`, seed Node, OTel span processor                            |
| B10  | Prod readiness                           | Bon potentiel, mais prod sérieuse = K8s/Helm recommandé, sizing ClickHouse/S3/backups, auth/SSO, rétention, masking. Docker Compose non HA.                            | À cadrer                                 | Docs recommandent K8s pour HA/high-throughput                            |
| B-TS | LangGraph/LangChain TypeScript           | Forte compatibilité probable. Le seed reproduit la forme d’un run LangGraph.js : root turn, generation, tool, guardrail, scores.                                       | Smoke validé “shape”                     | À brancher sur vrai LangGraph.js si Langfuse shortlist                   |

## 4. Points forts

- SDK TypeScript moderne, première classe.
- Tracing construit sur OpenTelemetry.
- Observations typées adaptées aux agents : `GENERATION`, `TOOL`, `SPAN`.
- Usage/cost natifs sur générations.
- Scores via SDK/API simples, avec granularité trace/observation/session.
- Self-host réel, architecture scalable : Postgres + ClickHouse + Redis + S3.
- Très bon fit avec Mastra ou LangGraph.js si AnSu part fortement TypeScript.

## 5. Limites / points d’attention

- Infra locale plus lourde que MLflow/Phoenix ; la stack consomme vite CPU/RAM au premier démarrage.
- Docker Compose officiellement non HA ; production plutôt Kubernetes/Helm.
- API publique et UI peuvent être lentes au premier démarrage/migrations si d’autres POC tournent en parallèle.
- Metadata propagée doit être string-compatible ; pour objets AnSu imbriqués, utiliser JSON string ou champs structurés dédiés.
- Prompt management et datasets/evals avancées non encore testés dans ce POC minimal.
- Scores peuvent exister sans trace si un run échoue après scoring ; prévoir idempotency/cleanup dans CI.

## 6. Comparaison provisoire avec MLflow

| Sujet              | MLflow                              | Langfuse                      |
| ------------------ | ----------------------------------- | ----------------------------- |
| Orientation        | MLOps / AI engineering / recherche  | LLM observability produit     |
| DX Python          | Très forte                          | Bonne                         |
| DX TypeScript      | Faible/non naturelle                | Forte                         |
| Trace agentique UI | Correcte mais MLOps                 | Très alignée LLM/agent        |
| Evals/recherche    | Très forte, trace-based eval mature | Forte mais à tester plus loin |
| Prompt registry    | Validé fort dans POC                | À tester                      |
| Usage/cost LLM     | Possible via metadata/metrics       | Natifs sur générations        |
| Infra self-host    | Plus simple                         | Plus lourde mais scalable     |

## 7. Verdict provisoire

```txt
Langfuse = candidat très fort pour observability agentique produit,
surtout si AnSu retient Mastra/TypeScript comme runtime principal.
```

Position actuelle :

- MLflow garde l’avantage **évals/recherche/proof of impact** ;
- Langfuse prend l’avantage **observability runtime agentique + DX TypeScript** ;
- Phoenix reste à repasser avec la même grille avant décision.

## 8. Tests restants si Langfuse reste en shortlist

- Tester prompt management Langfuse : prompt master, variables, versions, rollback.
- Tester datasets/evals : dataset de conversations, scorer naïveté, non-régression.
- Brancher un mini vrai LangGraph.js ou Mastra avec spans automatiques/manuels.
- Tester l’ingestion de vrais `usage.cost` / `impacts` Albert depuis réponse API.
- Vérifier export API pour chercheurs + anonymisation + rétention.
- Clarifier SSO/RBAC/data masking côté self-host.
