# Synthèse runtimes agentiques — AnSu v2

> Statut : synthèse provisoire, construite à partir des questions prioritaires `A*`. Mastra et LangGraph/LangChain Python ont maintenant été testés sérieusement. Le runtime custom AnSu est reporté hors benchmark et sera repris en phase architecture MVP si nécessaire.

## 1. État des candidats

| Runtime | Statut | Points forts observés | Risques / points à challenger | Décision provisoire |
|---|---|---|---|---|
| Mastra | POC runtime validé | Agent multi-tour, mémoire native `thread/resource`, scorers, structured output, tools, multi-agent, workflows/processors avancés, Albert, Docker, DX claire TypeScript | Observability/storage partiels, façade AnSu à formaliser, versioning prompt/agent à tester via Mastra Editor ou registry AnSu | Shortlist — favori DX produit |
| LangGraph / LangChain Python derrière API AnSu | POC runtime validé | Graphe/state explicite, contrôle fin, tools/structured output/scorer, LangSmith très utile en debug dev, Albert + Mistral, Docker | Socle Python expert, app POC à modulariser, `thread_id`/ownership à cadrer, LangSmith pas validé prod/souverain | Shortlist — favori contrôle/graph-native |
| Runtime AnSu custom minimal TS | Reporté hors benchmark | Faisable pour un flow MVP linéaire et maîtrise métier maximale | Même minimal, devient vite une première brique MVP : stockage, contrats, modération, garde-fou, repair, logs | À reprendre en phase architecture produit, pas benchmark frameworks |

## 2. Mastra Runtime — conclusion provisoire

Mastra valide rapidement les capacités runtime nécessaires au POC agent naïf :

- agent multi-tour via mémoire native Mastra ;
- isolation session/user via `thread=sessionId` et `resource=userId` ;
- provider Mistral puis Albert validé ;
- façade Next `/api/agent` déjà possible ;
- metadata/version/provider/usage exposés dans la réponse API, avec coût/impacts Albert validés ;
- scorer pédagogique déterministe branché au runtime et visible dans Studio ;
- structured output validé avec un agent évaluateur séparé ;
- tool mock `searchKnowledge` défini, appelé, et visible via API/UI debug ;
- Docker/local reproductible ;
- code globalement lisible et DX jugée bonne.

Décision provisoire :

```txt
Mastra est le favori runtime à date pour un POC rapide avec trajectoire propre,
à condition de garder une façade AnSu stricte et de ne pas confondre runtime Mastra
avec observability/Studio Mastra.
```


## 3. LangGraph / LangChain Python — conclusion provisoire

LangGraph valide les mêmes capacités runtime principales derrière une façade FastAPI/Next compatible AnSu :

- agent naïf multi-tour via checkpointer et `thread_id` ;
- isolation session/user faisable via `thread_id` composite, avec ownership à porter par la façade AnSu ;
- Albert validé via OpenAI-compatible, Mistral câblé et validé pour tools ;
- metadata, tokens, coût/impacts Albert exposés côté API et visibles dans LangSmith via champs AnSu custom ;
- scorer pédagogique local visible dans l’API et comme feedback LangSmith natif ;
- structured output validé via `model.with_structured_output(...)` + schéma Pydantic ;
- tool calling validé avec Albert et Mistral, à condition d’expliciter `tool_choice="auto"` côté Albert ;
- Docker/local reproductible ;
- code relisible mais DX plus experte, nécessitant modularisation.

Décision provisoire :

```txt
LangGraph est en shortlist comme option graph-native/contrôle fin, à condition d’assumer
un socle Python agentique modulaire. LangSmith est excellent pour debug dev, mais reste
séparé de la décision observability prod/souveraine.
```

## 4. Mastra vs LangGraph — correction de lecture

Mastra sait gérer la majorité des patterns avancés évoqués pour LangGraph :

- avant LLM : normalisation, retrieval, safety via `inputProcessors`, guardrails, processors/workflows ;
- après LLM : scoring, repair, feedback via `outputProcessors`, `createScorer`, evals, retry processors ;
- après tool : validation/filtrage/transformation via tool schemas, processors ou workflows ;
- avant réponse : garde-fou final via output processors, tripwire, retry ;
- workflows complexes : `.then()`, `.branch()`, `.parallel()`, `.foreach()`, `.dowhile()`, `.dountil()`, nested workflows ;
- human-in-the-loop, suspend/resume, snapshots/time travel, restart/retry.

La différence n’est donc pas une capacité brute “LangGraph peut, Mastra ne peut pas”. Elle est plutôt :

```txt
Mastra = orchestration agentique haut niveau, batteries-included, DX produit TypeScript.
LangGraph = orchestration explicite par graphe d’état, très bon debug LangSmith, DX Python expert.
```

Mastra reste donc très crédible pour des workflows avancés tout en gardant une meilleure proximité avec le produit TypeScript. LangGraph reste très crédible si l’équipe veut modéliser explicitement une machine d’état agentique côté Python.

## 5. Points de vigilance

### 5.1 Façade AnSu

Le front et le produit ne doivent pas dépendre directement des objets Mastra. La façade `AgentTurnRequest/Response` doit être formalisée proprement, idéalement avec Zod.

### 5.2 Observability / Studio

Mastra Runtime fonctionne bien, mais Mastra Studio/Observability est à évaluer séparément en catégorie B.

Points observés :

- traces agent visibles ;
- `scorer_run` visible dans Studio ;
- `availableTools` visible dans traces ;
- `/api/observability/scores` non supporté par le storage actuel ;
- logs Studio : listing non supporté par le storage actuel ;
- coût/impacts Albert récupérés côté API (`usage.cost`, `usage.impacts`), pas encore stockés/visualisés clairement dans les traces.

### 5.3 Sources et tools

Le tool `searchKnowledge` valide l’approche technique, mais reste mocké. Un test RAG réel devra vérifier :

- grounding strict sur les sources ;
- interdiction d’inventer des URLs ;
- affichage contrôlé des sources côté UI ;
- traçage exploitable des tool calls/results.

### 5.4 Versioning agent/prompt

Le versioning minimal est présent via metadata (`agentVersion`, `promptVersion`), mais le vrai lifecycle agent/prompt reste à tester.

Piste prometteuse : Mastra Editor, notamment en mode `source: 'code'` pour garder des overrides JSON versionnés Git/PR.

## 6. Questions Mastra Runtime validées

| ID | Question | Statut |
|---|---|---|
| A1* | Le runtime permet-il de faire tourner un agent naïf multi-tour ? | Validé POC |
| A2* | La mémoire de session est-elle isolée par `sessionId` / `userId` ? | Validé POC |
| A3* | Peut-on utiliser Mistral maintenant, puis Albert plus tard ? | Validé POC |
| A4* | Peut-on utiliser ce runtime sans rendre le produit dépendant de ses abstractions internes ? | Validé POC / à formaliser |
| A5* | Peut-on tracer `sessionId`, `userId`, `agentVersion`, `promptVersion`, provider et modèle ? | Validé API / traces à confirmer |
| A6* | Peut-on brancher un scorer pédagogique simple ? | Validé POC |
| A7* | Le runtime permet-il de produire du structured output ? | Validé POC |
| A8* | Peut-on définir, appeler et tracer un tool avec une bonne DX ? | Validé POC |
| A11* | Quelle est la DX de câblage ? | Validé POC / vigilance observability |
| A12* | Le runtime est-il Docker/local reproductible ? | Validé POC |
| A13* | Si on remplace ce runtime, le métier AnSu reste-t-il portable ? | Validé POC / frontière à maintenir |

Voir détail : [`fiches/runtime-mastra.md`](./fiches/runtime-mastra.md).


## 7. Questions LangGraph Runtime validées

| ID | Question | Statut |
|---|---|---|
| A1* | Le runtime permet-il de faire tourner un agent naïf multi-tour ? | Validé POC |
| A2* | La mémoire de session est-elle isolée par `sessionId` / `userId` ? | Validé POC / DX-sécurité à cadrer |
| A3* | Peut-on utiliser Mistral maintenant, puis Albert plus tard ? | Albert validé POC / Mistral validé tools |
| A4* | Peut-on utiliser ce runtime sans rendre le produit dépendant de ses abstractions internes ? | Validé POC / contrat à formaliser |
| A5* | Peut-on tracer `sessionId`, `userId`, `agentVersion`, `promptVersion`, provider et modèle ? | Validé POC API + LangSmith custom metadata/output |
| A6* | Peut-on brancher un scorer pédagogique simple ? | Validé POC API + LangSmith feedback natif |
| A7* | Le runtime permet-il de produire du structured output ? | Validé POC via `with_structured_output` |
| A8* | Peut-on définir, appeler et tracer un tool avec une bonne DX ? | Validé POC Albert + Mistral / DX plus verbeuse |
| A11* | Quelle est la DX de câblage ? | Validé POC / DX expert, modularisation requise |
| A12* | Le runtime est-il Docker/local reproductible ? | Validé POC / readiness dashboard à améliorer |
| A13* | Si on remplace ce runtime, le métier AnSu reste-t-il portable ? | Validé POC / adapter AnSu à formaliser |

Voir détail : [`fiches/runtime-langgraph-python.md`](./fiches/runtime-langgraph-python.md).


## 8. Décision sur le runtime custom

Le runtime custom AnSu n’est pas traité comme un troisième challenger dans ce benchmark frameworks. Même une version minimaliste sortirait vite du cadre de comparaison et deviendrait une première brique du MVP : choix de stockage, contrats métier, modération prompt injection, garde-fou post-réponse, réparation/fallback, logs et provider abstraction.

Décision :

```txt
Runtime custom = option stratégique faisable, mais reportée à la phase architecture MVP.
Benchmark frameworks = comparer et consolider Mastra vs LangGraph/LangChain.
```

Cette décision évite de comparer un framework existant avec un début d’implémentation produit non équivalent.

## 9. Questions reportées après shortlist

| ID | Question | Pourquoi reportée |
|---|---|---|
| A9 | Le streaming est-il possible sans perdre traces et contrôle ? | Important, mais non bloquant pour shortlist initiale. |
| A10 | Peut-on appliquer des guardrails avant/après réponse ? | À tester si Mastra reste favori, surtout réparation/blocage après score faible. |

## 10. Prochaines actions

1. Shortlist runtime à deux actée : Mastra + LangGraph/LangChain Python.
2. Évaluer séparément les plateformes observability/evals, notamment : Mastra Observability, LangSmith, Phoenix, Langfuse, MLflow, Promptfoo.
3. Tester en priorité la compatibilité runtime ↔ observability en scénario hybride : instrumentation, traces, scores, tool calls, structured outputs, IDs de corrélation.
4. Vérifier explicitement dans chaque outil observability la récupération/visualisation des données Albert : tokens, `usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq`.
5. Si Mastra reste favori, tester Mastra Editor pour versioning agent/prompt.
6. Si LangGraph reste très attractif, tester LangChain/LangGraph TypeScript pour évaluer le gain DX dans la stack produit.

## 11. Décision de shortlist runtime

Décision provisoire après benchmark A* : garder une shortlist à deux.

```txt
Shortlist runtime MVP AnSu v2 = Mastra + LangGraph/LangChain Python.
Runtime custom = reporté à la phase architecture MVP.
```

### Lecture comparative finale provisoire

| Critère | Mastra | LangGraph / LangChain Python |
|---|---|---|
| DX produit | Meilleure : TypeScript, proche Next/product, agent/memory/tools/scorers déclaratifs | Plus experte : Python/LangChain/LangGraph, concepts plus nombreux |
| Mémoire session/user | Très naturelle via `thread` + `resource`, isolation plus explicite | Faisable via `thread_id` composite + checkpointer, ownership à porter par la façade AnSu |
| Workflows avancés | Supportés via Agents, Processors, Workflows, guardrails, retry, suspend/resume | Très explicites via `StateGraph`, nodes, edges, checkpointer |
| Tools | Bonne DX avec `createTool`, Zod schemas ; tracing tool moins détaillé observé dans le POC | Tool loop très observable ; nécessite câblage explicite (`ToolNode`, edges, `tool_choice="auto"` pour Albert) |
| Structured output | Validé via agent évaluateur + Zod/structured output | Validé via `with_structured_output` + Pydantic, parser visible `RunnableLambda` |
| Scoring / garde-fous | Scorers/evals/processors natifs intéressants, à approfondir pour repair/blocage | Score node explicite + feedback LangSmith natif validé |
| Observability dev | Studio utile mais limites observées sur logs/scores/storage/coûts | LangSmith excellent pour debug dev, mais prod/souveraineté à traiter séparément |
| Portabilité métier | Bonne si façade AnSu maintenue | Bonne si adapter LangGraph isolé et app POC modularisée |
| Risque principal | Couplage Mastra/Studio/observability, storage et versioning prompts à clarifier | Socle Python expert + modularisation nécessaire + LangSmith non validé prod |

### Positionnement

```txt
Mastra = favori DX produit / TypeScript / vitesse MVP.
LangGraph = favori orchestration explicite par graphe d’état / debug agentique détaillé.
```


### Point à départager plus tard : LangChain/LangGraph TypeScript

Pour départager complètement Mastra et LangGraph, il faudra tester une variante LangChain/LangGraph TypeScript. Objectif : vérifier si l’on peut conserver les bénéfices du modèle graph/state et de l’écosystème LangChain tout en réduisant le coût DX lié au socle Python.

Question à traiter après les plateformes observability/evals ou si LangGraph reste très attractif :

```txt
LangChain/LangGraph TypeScript apporte-t-il une DX suffisamment meilleure pour concurrencer Mastra côté stack produit, tout en gardant l’orchestration explicite observée en Python ?
```

La décision finale runtime ne doit pas être prise uniquement sur les capacités A*, car les deux passent le benchmark. Les prochains facteurs discriminants sont :

- observability/evals compatible avec les besoins AnSu ;
- stratégie de stockage métier vs traces ;
- garde-fous/modération/réparation du MVP ;
- capacité de l’équipe à maintenir le socle choisi ;
- intégration dans l’architecture produit cible.

