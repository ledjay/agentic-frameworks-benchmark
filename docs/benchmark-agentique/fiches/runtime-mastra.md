# Mastra — Runtime agentique

> **Statut : brouillon collaboratif.** Ne pas considérer cette fiche comme validée tant que les questions n’ont pas été traitées avec preuves et validation Jérémie.

## 1. Identification

- **Outil :** Mastra
- **Catégorie principale :** A — runtime agentique
- **Capacité secondaire testée ailleurs :** B — Mastra Observability / Scorers
- **POC local :** `pocs/runtimes/mastra/`
- **Provider de test actuel :** Mistral direct
- **Provider cible à revalider :** Albert API, reporté à réception de clé

## 2. Questions structurantes à traiter

Les questions actives sont dans [`QUESTIONS_STRUCTURANTES.md`](../QUESTIONS_STRUCTURANTES.md). Cette fiche répond d’abord aux questions runtime A.

| ID | Question | Réponse proposée | Statut | Preuves | Validation Jérémie |
|---|---|---|---|---|---|
| A1* | Le runtime permet-il de faire tourner un agent naïf multi-tour ? | Oui, via mémoire native Mastra (`Memory`, `thread=sessionId`, `resource=userId`). Test 2 tours validé : la façade n’envoie que le dernier message, Mastra réinjecte l’historique côté provider. | Validé POC | `src/mastra/agents/naive-agent.ts`, `app/api/agent/route.ts`, smoke test `eval-mastra-a1-*` | Validé Jérémie |
| A2* | La mémoire de session est-elle isolée par `sessionId` / `userId` ? | Oui, facilement via mémoire native Mastra : `thread=sessionId`, `resource=userId`. Deux sessions distinctes ne partagent pas l’historique ; même thread avec autre resource renvoie `403`. | Validé POC | `app/api/agent/route.ts`, tests `eval-mastra-a2-*` | Validé Jérémie — facile |
| A3* | Peut-on utiliser Mistral maintenant, puis Albert plus tard ? | Oui. Mistral validé via `@ai-sdk/mistral`. Albert validé via provider OpenAI-compatible (`@ai-sdk/openai-compatible`, base `https://albert.api.etalab.gouv.fr/v1`, modèle `albert-large`). Réponse agent OK, `usage.cost` et `usage.impacts` présents dans l’usage brut. | Validé POC | `src/lib/model-provider.ts`, `docker-compose.yml`, tests `eval-mastra-albert-*` | Validé Jérémie |
| A4* | Peut-on utiliser ce runtime sans rendre le produit dépendant de ses abstractions internes ? | Oui, partiellement validé : le front appelle déjà une façade Next `/api/agent` qui masque l’API Mastra. À formaliser encore avec un vrai contrat `AgentTurnRequest/Response` Zod et une réponse normalisée. | Validé POC / à formaliser | `app/api/agent/route.ts`, `src/lib/ansu-contract.ts` | Validé Jérémie |
| A5* | Peut-on tracer `sessionId`, `userId`, `agentVersion`, `promptVersion`, provider et modèle ? | Oui dans la réponse normalisée `/api/agent` : `runtime`, `provider`, `model`, `agentVersion`, `promptVersion`, `traceId`, `spanId`, `usage`, `memory`. Usage Albert câblé et validé : tokens, `usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq` récupérés côté API. Ajout aussi dans `tracingOptions.metadata`, à vérifier côté Studio/traces. | Validé POC API / traces à confirmer | `app/api/agent/route.ts`, `src/lib/model-provider.ts`, tests `eval-mastra-a5-normalized-*`, `eval-mastra-albert-cost-*` | Validé Jérémie |
| A6* | Peut-on brancher un scorer pédagogique simple ? | Oui. Scorer déterministe `ansu-naivety-contract` branché à l’agent, exécuté sur les runs et visible dans Studio avec `score`/`generateScoreStepResult`. LLM-as-judge non testé. API dédiée `/api/observability/scores` non supportée par le storage actuel, mais scores visibles via traces Studio. | Validé POC | `src/mastra/scorers/naivety-contract.ts`, `src/mastra/agents/naive-agent.ts`, Studio, `/api/scores/scorers` | Validé Jérémie |
| A7* | Le runtime permet-il de produire du structured output ? | Oui. Test “Rendre ma copie” validé avec un agent évaluateur séparé `agent-evaluateur-comprehension-ansu`, schéma Zod métier converti en JSON Schema via `structuredOutput`, réponse revalidée par Zod et affichée en checklist. Validé avec Mistral puis Albert. | Validé POC | `src/lib/ansu-contract.ts`, `src/mastra/agents/assessment-agent.ts`, `app/api/agent/assess/route.ts`, tests `eval-mastra-a7-agent-*`, `eval-mastra-albert-a7-*` | Validé Jérémie |
| A8* | Peut-on définir, appeler et tracer un tool avec une bonne DX ? | Oui. Tool mock `searchKnowledge` défini avec `createTool`, `inputSchema`/`outputSchema` Zod, branché à l’agent et appelé par le modèle. `toolCalls`/`toolResults` visibles dans la réponse raw et l’UI debug. Studio trace `availableTools`, mais pas de span tool détaillé séparé observé. Recherche réelle/RAG non testés ; grounding strict des sources à renforcer. | Validé POC | `src/mastra/tools/knowledge-tool.ts`, `naive-agent.ts`, UI debug, test `eval-mastra-a8-tools-*` | Validé Jérémie — approche validée |
| A9 | Le streaming est-il possible sans perdre traces et contrôle ? | À traiter après shortlist | À confirmer | — | — |
| A10 | Peut-on appliquer des guardrails avant/après réponse ? | À traiter après shortlist | À confirmer | — | — |
| A11* | Quelle est la DX de câblage ? | Bonne DX POC : déclaration agent lisible, mémoire `thread/resource` simple, scorer déclaratif, multi-agent direct, structured output clair, provider Mistral/Albert centralisé. Points rugueux surtout côté observability/storage (`logs`/`scores` non listables) et nécessité d’une façade AnSu pour normaliser. | Validé POC / vigilance observability | `naive-agent.ts`, `assessment-agent.ts`, `naivety-contract.ts`, `agent/route.ts`, `agent/assess/route.ts` | Validé Jérémie — code très clair |
| A12* | Le runtime est-il Docker/local reproductible ? | Oui. `task mastra:up` rebuild/lance `pocs/runtimes/mastra`, `mastra-studio`, `mastra-gateway`; healthcheck sur `/api/agents`; endpoints API, dashboard Next et Studio répondent HTTP 200. Mode réel via `.env` Mistral/Albert, mock disponible sans clé. | Validé POC | `Taskfile.yml`, `docker-compose.yml`, `Dockerfile`, healthchecks HTTP 200 | Validé Jérémie |
| A13* | Si on remplace Mastra comme runtime, le métier AnSu reste-t-il portable ? | Oui si la façade AnSu reste la frontière. Portables : prompts métier, schémas Zod, `scoreNaivety`, contrat API, provider Albert/Mistral, UI Next. À réimplémenter : `Agent`, `Memory`, `createScorer`, appels `/api/agents/.../generate`, structuredOutput Mastra. Studio/traces/editor sont hors scope runtime et à traiter en catégorie B. | Validé POC / frontière à maintenir | `src/lib/ansu-contract.ts`, `src/lib/model-provider.ts`, façade `/api/agent` | Validé Jérémie |

## 3. Notes de validation

Les réponses seront ajoutées progressivement après discussion.


## 4. Points à reporter côté observability/evals

- Vérifier pour chaque outil observability/evals que les données Albert (`usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq`, tokens) sont bien ingérables, filtrables et visualisables dans l’outil, pas seulement présentes dans la réponse brute provider.
- Dans Mastra Runtime, ces données sont récupérées côté `/api/agent` avec Albert, mais ne sont pas encore visibles dans les attributs de trace Mastra : stockage/dashboard coût à compléter.

## 5. Pistes trajectoire

- Piste à tester : Mastra Editor pour versioning agent/prompt, drafts/published/archived, rollback et version targeting. Mode `source: 'code'` potentiellement intéressant pour garder les overrides en JSON déterministe versionnés Git/PR.

## Note comparative Mastra / LangGraph — patterns avancés

Mastra ne doit pas être sous-estimé sur les workflows avancés. D’après la documentation Mastra, les patterns suivants sont supportés via Agents, Processors et Workflows :

- avant LLM : `inputProcessors`, normalisation, moderation, prompt injection, PII, token limiting, semantic recall ;
- après LLM : `outputProcessors`, validation, retry, tripwire, scorers/evals ;
- après tool : schemas de tools, inspection `toolCalls`/`toolResults`, processors ou workflow steps dédiés ;
- avant réponse : output guardrails, `abort`, retry, stream filtering ;
- orchestration : `.then()`, `.branch()`, `.parallel()`, `.foreach()`, `.dowhile()`, `.dountil()`, nested workflows ;
- long-running flows : suspend/resume, human-in-the-loop, snapshots/time travel, restart.

La différence avec LangGraph n’est donc pas une incapacité brute de Mastra. Mastra propose une orchestration plus haut niveau/batteries-included, proche TypeScript produit ; LangGraph propose un graphe d’état plus explicite et bas niveau.
