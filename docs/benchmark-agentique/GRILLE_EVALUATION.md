# Grille d’évaluation v2 — stack agentique AnSu

> Statut : grille v2 validée méthodologiquement après pivot playground. Elle remplace la logique de comparaison par POC isolé.

## 0. Principe directeur

Le benchmark doit identifier une trajectoire technique permettant de livrer vite sans salir la suite.

```txt
POC rapide, trajectoire propre.
```

On ne valide plus un outil parce que son POC marche isolément. On valide une brique parce qu’elle passe une combinaison réelle dans le playground commun.

```txt
seed = debug / remplissage, non décisionnel
mock = dev/debug, non décisionnel
fake = baseline UI, hors benchmark
preuve benchmark = playground + runtime réel + gateway/model réel + observability réelle
```

## 1. Méthode v2 : playground-first

La référence de test est :

```txt
pocs/playground/
```

Le playground teste la matrice :

```txt
runtime × observability/evals × llm gateway × model
```

Flux canonique :

```txt
TurnRequest
  → RuntimeResult
  → TraceResult
  → TurnResponse
```

Trace canonique attendue :

```txt
ansu.playground.agent_turn
├─ moderation
├─ naive_agent_llm       (generation)
├─ searchKnowledge       (tool)
└─ guardrail_score
```

## 2. Niveaux de preuve

Chaque réponse doit indiquer son niveau de preuve.

| Niveau | Signification | Force décisionnelle |
|---|---|---|
| `Doc` | Déduit de la documentation officielle, non testé | Contexte uniquement |
| `Technique isolée` | Seed, script, POC propre à l’outil, mock ou fake | Non décisionnel |
| `Playground réel` | Test via `pocs/playground` avec runtime réel + provider/model réel + observability réelle | Forte |
| `Capture` | Screenshot intégré à la doc, lié à une question et un traceId | Appui visuel |
| `Validation Jérémie` | Réponse relue/acceptée en séance | Décisionnelle |

Règle : une brique ne peut être considérée comme **validée benchmark** que si elle a une preuve `Playground réel` sur les critères must-have. Les seeds, mocks et fake servent au debug, jamais à la décision.

## 3. Statuts de réponse

| Statut | Signification |
|---|---|
| `Validé benchmark` | Testé via playground réel + résultat accepté |
| `Validé technique` | POC/seed/mock concluant, utile mais non décisionnel |
| `À confirmer` | Indice sérieux, mais preuve incomplète |
| `Incertain` | Information manquante ou contradictoire |
| `Reporté` | Différé volontairement, par exemple clé Albert absente |
| `Non applicable` | Critère hors périmètre de la brique |

## 4. Catégories évaluées

### A. Runtimes agentiques

Objectif : exécuter l’agent naïf avec le même contrat et les mêmes capacités.

Runtimes en cours :

| Runtime | Statut v2 |
|---|---|
| `fake` | Dev/debug only, hors benchmark |
| `langgraph-typescript` | Techniquement câblé ; validation benchmark réelle à faire avec provider réel |
| `mastra` | POC riche validé ; adapter playground présent, à revalider |
| `langgraph-python` | POC riche validé ; adapter playground présent, à revalider |

Tous doivent suivre `pocs/RUNTIME_CAPABILITIES.md`.

### B. Observability / evals / prompt management

Objectif : recevoir la trace canonique, permettre inspection, scores, exports, evals, prompts, et rester miroir technique sans devenir source de vérité métier.

Plateformes en cours :

| Plateforme | Statut v2 |
|---|---|
| `langfuse` | Validé playground initial |
| `mlflow` | Validé technique isolée ; adapter playground à câbler |
| `phoenix` | POC historique ; adapter playground/fiche à refaire |
| `mastra observability` | À tester séparément comme brique B intégrée |
| `promptfoo` | À considérer pour CI/non-régression, pas dashboard produit |

### C. LLM gateway / model

Objectif : pouvoir comparer le comportement runtime et les traces selon le combo LLM choisi.

Valeurs playground :

| Gateway | Exemples | Statut |
|---|---|---|
| `mock` | `deterministic-naive-agent` | Dev/debug only, hors décision |
| `albert` | `albert-large` | Cible, tests réels selon clé/API |
| `mistral` | `mistral-small-latest` | Fallback dev |
| `openai-compatible` | modèle libre | À cadrer selon gateway |

### D. Knowledge / RAG léger

Différé. Pour la phase actuelle, on vérifie seulement le tool canonique `searchKnowledge` et sa traçabilité.

## 5. Gates éliminatoires

Un scénario ne doit pas être retenu si :

| Gate | Critère |
|---|---|
| G1 | Impossible à lancer localement/Docker de manière reproductible |
| G2 | Impossible de garder une façade AnSu stable |
| G3 | Données/traces non exportables ou enfermées |
| G4 | Impossible de tracer session/runtime/provider/model/score |
| G5 | Capture obligatoire de données élèves dans un SaaS non maîtrisé sans alternative |
| G6 | Pas de trajectoire raisonnable pour Albert ou gateway OpenAI-compatible |
| G7 | Interface ou API trop opaque pour debugger une session agentique |

## 6. Questions A — runtimes agentiques v2

La comparaison runtime active porte principalement sur **Mastra** et **LangGraph**.

- **Vercel AI SDK** sert de baseline TypeScript explicite : utile pour comprendre la plomberie, pas candidat principal à ce stade.
- **LangChain** est traité comme écosystème/brique, notamment derrière LangGraph, pas comme candidat runtime autonome dans la décision finale.

Question centrale :

> Quel moteur permet de construire vite, de comprendre les erreurs, et de maintenir le produit dans 6 mois ?

| ID | Critère | Question | Preuve attendue |
|---|---|---|---|
| A0* | API runtime | Le runtime expose-t-il des routes API utilisables out-of-the-box ? | Documentation routes / OpenAPI / client SDK |
| A1* | API AnSu unique | Peut-on placer le runtime derrière une API AnSu unique (Hono/Fastify/autre) qui route vers l’API du runtime sans exposer ses routes au produit ? | Route AnSu stable + appel/proxy vers API runtime + réponse normalisée |
| A2* | Bootstrap | Peut-on créer vite un agent naïf traçable ? | Code agent + trace exploitable |
| A3* | Tools | `searchKnowledge` est-il typé, appelé et tracé ? | Code tool + input/output visibles dans trace |
| A4* | Mémoire | La session multi-tour est-elle isolée par `sessionId` / `userId` ? | Test même session / autre session / autre user |
| A5* | Non-linéarité | Routing, check et repair restent-ils lisibles quand le flux se complexifie ? | Code workflow/graph + trace du chemin exécuté |
| A6* | Debug | Quand l’agent déraille, peut-on comprendre où, pourquoi, avec quelles données et quelle version ? | Trace avec étapes, erreurs, metadata versions |
| A7* | Scoring / guardrails | Peut-on valider, scorer, bloquer ou réparer une réponse ? | Score naïveté + décision repair visible |
| A8* | Versions | Agent, prompt et modèle sont-ils traçables par version ? | `agentVersion`, `promptVersion`, modèle, provider dans Langfuse |
| A9* | DX / testabilité | Le code est-il maintenable et testable par l’équipe ? | Notes d’implémentation, build, quantité de plomberie |
| A10* | Prod / sécurité | Self-host, logs, secrets et données sensibles sont-ils maîtrisables ? | Config, filtres, stockage, risques identifiés |
| A11 | Streaming | Streaming utile sans perdre contrôle ni traces ? | Test UI + trace complète si temps |
| A12 | Fit pédagogique | Le runtime aide-t-il à représenter une intention pédagogique ? | Scénario AnSu concret : aide naïve, indice, repair |

Les questions marquées `*` sont prioritaires pour la décision mercredi.

Les sujets suivants restent importants mais ne doivent pas alourdir la comparaison runtime :

- prompt management détaillé → catégorie B / Langfuse ;
- coût, tokens et impacts Albert → catégorie C + metadata runtime ;
- RAG documentaire complet → catégorie D ;
- RBAC, rétention et export des traces → catégorie B / infra.

## 7. Questions B — observability / evals / prompt management v2

| ID | Critère | Question | Preuve attendue |
|---|---|---|---|
| B1* | Self-host / souveraineté | Peut-on l’héberger proprement ? Licence compatible ? | docker/helm/licence/auth |
| B2* | Ingestion playground | Peut-il recevoir la trace canonique `ansu.playground.agent_turn` ? | trace créée depuis playground |
| B3* | Trace agentique | La trace est-elle lisible : agent, LLM, tool, guardrail ? | UI + API/export |
| B4* | Recherche session | Peut-on filtrer par `sessionId`, `userId`, runtime, model ? | UI ou requête API |
| B5* | Scores custom | Peut-on stocker/afficher `ansu_naivety` ? | score attaché trace/session |
| B6* | Evals / datasets | Peut-on faire dataset, replay, comparaison, non-régression ? | dataset/eval minimal ou preuve doc + test |
| B7* | Export API | Peut-on exporter traces/scores dans un format exploitable ? | JSON/CSV/SQL/API/OTel |
| B8* | Coût / tokens / impacts | Peut-on suivre tokens, coût, kWh, kgCO2eq, latence, erreurs ? | champs visibles/filtrables/exportables |
| B9 | Structured outputs | Peut-on stocker/filtrer les JSON métier ? | guardrail/moderation/assessment JSON |
| B10* | Prompt management | Peut-on créer, éditer, organiser les prompts ? | UI/API prompt registry |
| B11* | Prompt versioning | Peut-on versionner, tagger, rollback, comparer ? | version utilisée dans trace |
| B12* | Prompt variables | Peut-on injecter des variables efficacement ? | template, variables détectées, compile/preview |
| B13* | Clarté UI | L’interface est-elle claire/simple pour inspecter traces/prompts/evals ? | jugement en séance + captures/notes |
| B14* | Sécurité / prod | Auth, RBAC, rétention, backup, masking ? | OSS vs enterprise, reverse proxy, docs |
| B15* | Portabilité métier | L’outil reste-t-il miroir sans devenir source de vérité AnSu ? | séparation DB AnSu / outil obs |
| B16* | DX intégration | SDK/API simples côté TypeScript/Python ? | quantité de code, pièges, stabilité |
| B17 | Feedback humain | Peut-on annoter/taguer/transformer un feedback prof ? | annotation/feedback API |
| B18 | Alerting/release gate | Peut-on bloquer/alerter en cas de régression ? | CI/eval hooks, reporté si hors POC |

## 8. Questions C — provider / gateway v2

| ID | Critère | Question | Statut par défaut |
|---|---|---|---|
| C1* | Mistral | Le runtime peut-il appeler Mistral proprement ? | À confirmer par runtime |
| C2* | Albert | Le runtime peut-il appeler Albert OpenAI-compatible ? | Reporté/à tester selon clé |
| C3* | Gateway dynamique | Le combo gateway/model choisi dans le front est-il propagé ? | À valider playground |
| C4* | Usage tokens | Tokens récupérés et tracés ? | À confirmer |
| C5* | Coût | `usage.cost` conservé ? | À confirmer / Reporté Albert |
| C6* | Impacts | `usage.impacts.kWh/kgCO2eq` conservés ? | À confirmer / Reporté Albert |
| C7 | Erreurs/rate limits | Les erreurs provider sont-elles compréhensibles ? | À confirmer |
| C8 | Coûts réels vs estimés | Source de vérité coût claire ? | À confirmer |

## 9. Questions D — knowledge / RAG léger

| ID | Critère | Question | Statut |
|---|---|---|---|
| D1 | Tool | Le runtime appelle-t-il `searchKnowledge` ? | À confirmer |
| D2 | Sources | Les sources utilisées sont-elles tracées ? | À confirmer |
| D3 | Contrôle réponse | Les sources ne cassent-elles pas la posture naïve ? | À confirmer |
| D4 | Isolation documents | Documents isolables par prof/classe/activité ? | Reporté |
| D5 | Refresh/delete | Suppression/rafraîchissement maîtrisés ? | Reporté |

## 10. Protocole de validation d’un outil

Pour chaque outil ou brique :

1. Identifier la catégorie principale : runtime, observability/evals, provider, knowledge.
2. Lancer le service via `task ...`.
3. Exerciser le scénario canonique depuis `pocs/playground` si applicable.
4. Noter le niveau de preuve pour chaque question.
5. Valider en séance les réponses `*`.
6. Seulement ensuite générer ou mettre à jour la fiche.

## 11. Scénarios canoniques playground

## 12. Captures d’écran comme preuves visuelles

Les screenshots font partie du protocole de preuve, surtout pour B3 trace lisible, B10-B12 prompt management et B13 clarté UI.

Deux modes sont acceptés :

1. **Automatisé** : script Playwright ou équivalent lancé par l’agent pour capturer une URL stable.
2. **Manuel** : capture faite par Jérémie quand l’outil nécessite login, navigation interactive ou inspection visuelle fine.

Règles :

- utiliser uniquement des données synthétiques ;
- ne jamais capturer de secret, token, clé API ou donnée élève réelle ;
- associer chaque screenshot à une question, un outil, un combo et si possible un `traceId` ;
- stocker dans `docs/benchmark-agentique/assets/screenshots/` ;
- intégrer dans les fiches avec Markdown.

Convention :

```txt
YYYY-MM-DD__<question-id>__<outil>__<vue>__<combo>.png
```

Exemple :

```md
![B3 — Trace Langfuse lisible](./assets/screenshots/2026-06-23__B3__langfuse__trace-tree__mastra-mistral.png)
```

Une capture illustre une preuve ; elle ne remplace pas le test, le `traceId`, l’export ou la validation en séance.

## 13. Scénarios canoniques playground

### Scénario S0 — baseline confusion

```txt
message = Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.
runtime = à varier
observability = à varier
llm.gateway = mistral
llm.model = mistral-small-latest
```

### Scénario S1 — demande de réponse directe

```txt
message = Donne-moi directement la réponse sur la photosynthèse.
```

Attendu : refus bref + relance.

### Scénario S2 — combo LLM alternatif

```txt
llm.gateway = albert
llm.model = albert-large
```

Attendu : provider/model visibles dans réponse et trace, avec coût/impacts Albert conservés si l’API les expose.

### Scénario S3 — trace observability

```txt
observability = langfuse / mlflow / phoenix
```

Attendu : même structure de trace et score `ansu_naivety`.

## 14. Livrables d’évaluation

Pour chaque brique shortlistée :

```txt
fiches/runtime-<outil>.md
fiches/observability/<outil>.md
```

Chaque fiche doit afficher en haut :

```txt
Statut : Validé benchmark / Validé technique / À confirmer
Niveau de preuve principal : Playground / Technique isolée / Doc
Dernier scénario testé : ...
Dernier traceId : ...
```
