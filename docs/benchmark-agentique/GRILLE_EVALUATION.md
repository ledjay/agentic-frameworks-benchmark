# Grille d’évaluation stack technique AnSu

## 0. Principe directeur

Le benchmark ne vise pas seulement à trouver l’outil qui permet d’aller le plus vite pour le POC. Il doit identifier une trajectoire technique permettant de **continuer de construire proprement ensuite**.

Formule courte :

> **POC rapide, trajectoire propre.**

On accepte des compromis de POC s’ils sont explicites et contenus. On refuse les choix qui capturent le modèle métier AnSu, enferment les données, rendent les traces inexploitables ou empêchent de remplacer une brique structurante plus tard.

Les fonctionnalités avancées disponibles out-of-the-box sont valorisées comme accélérateurs, mais elles ne compensent jamais un défaut sur les critères fondamentaux : maîtrise des données, exportabilité, traçabilité, intégration produit, compatibilité provider cible et capacité à continuer de construire proprement ensuite.

Règle d’arbitrage :

> **Must-have + trajectoire propre > bonus out-of-the-box.**

## 1. Méthode générale

On ne compare pas directement tous les outils entre eux. Les outils ne jouent pas tous le même rôle : certains exécutent les agents, d’autres observent et évaluent, d’autres fournissent les modèles ou la connaissance documentaire.

La méthode se fait en trois niveaux :

1. **Outil** — identifier ce qu’est l’outil : catégorie principale, capacités secondaires, contraintes, statut.
2. **Brique** — tester l’outil dans un rôle donné, avec un protocole adapté à sa catégorie.
3. **Scénario** — composer plusieurs briques dans une architecture réaliste AnSu, puis décider.

Un outil peut apparaître dans plusieurs catégories si ses capacités le justifient. Dans ce cas, il est testé séparément dans chaque rôle, avec des résultats distincts. Sa catégorie principale reste explicitement indiquée pour éviter de mélanger les critères.

Exemple : Mastra est d’abord un runtime agentique, mais ses capacités natives d’observability/scorers doivent aussi être testées comme une brique d’évaluation intégrée.

Formule simple :

> **On classe les outils, on teste les briques dans leur rôle, on décide sur des scénarios d’architecture.**

Les questions prioritaires à résoudre et leur statut de réponse sont suivis dans [`QUESTIONS_STRUCTURANTES.md`](./QUESTIONS_STRUCTURANTES.md). La grille ci-dessous définit la méthode ; le fichier de questions sert de tableau de pilotage des réponses à produire.

La décision finale ne doit donc pas porter sur “Mastra vs Phoenix” ou “MLflow vs LangGraph” pris isolément, mais sur des scénarios tels que :

- Mastra comme runtime principal + observability native + dashboard AnSu ;
- runtime AnSu minimal TypeScript + observability externe ;
- LangGraph Python derrière une API AnSu + observability externe ;
- Mastra + Albert provider + export traces vers une brique d’observability dédiée.

Les familles servent à tester proprement. Les scénarios servent à décider.

## 2. Catégories d’outils à évaluer

### A. Runtimes agentiques — priorité 1

Objectif : exécuter des agents pédagogiques multi-tour avec mémoire, tools, garde-fous, traces, streaming et contrat API stable.

Vague 1 :

| Outil | Rôle testé | Remarques |
|---|---|---|
| **Mastra** | Runtime agentique TypeScript intégré | Agents, memory, tools, scorers, Studio. Déjà en POC. |
| **Runtime AnSu minimal TS + Vercel AI SDK** | Runtime maison minimal TypeScript | Le SDK seul n’est pas un runtime complet ; on teste la faisabilité d’un runtime AnSu maîtrisé. |
| **LangGraph / LangChain Python derrière API AnSu** | Runtime agentique mature en service séparé | Python est acceptable si le runtime expose une API stable, typée et testable. |

À considérer ensuite : LangGraph JS/TS, LlamaIndex si le RAG devient central, PydanticAI, Genkit, OpenAI Agents SDK, Semantic Kernel, CrewAI, AutoGen, Agno.

### B. Observability / evals / feedback — priorité 1

Objectif : reconstruire les sessions, tracer les runs, scorer, comparer les versions, exporter les données et alimenter l’amélioration continue.

Vague 1 :

| Outil | Rôle testé | Remarques |
|---|---|---|
| **Phoenix** | Traces / evals / inspection self-host | Déjà en POC. Très bon candidat observability. |
| **MLflow GenAI** | Tracking / registry / evals / expérimentation | Déjà en POC. Pertinent pour culture ML/research. |
| **Mastra Observability / Scorers** | Observability native attachée au runtime Mastra | À tester comme option intégrée ; ne remplace un outil dédié que si traces, scores, exports et sessions sont suffisants. |
| **Langfuse** | LLM observability / prompts / traces / evals | À ajouter en POC ; open source, orienté produit LLM. |
| **Promptfoo** | Golden datasets / tests CI / non-régression | Pas un dashboard produit, mais utile pour comparer prompts/providers/runtimes. |

À considérer ensuite : LangSmith si LangGraph/LangChain devient central, Braintrust, Helicone, W&B Weave, DeepEval, Ragas.

### C. Providers / gateways modèles — contrainte transversale

Le provider cible pressenti est **Albert API**, pour des raisons d’alignement institutionnel, de souveraineté, d’API OpenAI-compatible et de remontée native des usages, coûts et impacts environnementaux.

Mais tant qu’aucune clé Albert n’est disponible, les tests runtime se font avec **Mistral direct**.

Statuts :

| Provider | Statut |
|---|---|
| **Albert API** | Provider cible. Tests détaillés reportés à réception de la clé. |
| **Mistral direct** | Provider de test runtime actuel et fallback potentiel à revalider. |
| **LiteLLM** | Option gateway si besoin de normaliser providers/coûts nous-mêmes. |
| **OpenRouter** | Référence utile pour coût réel, mais pas cible souveraine. |
| **Vercel AI Gateway** | Pratique, mais souveraineté et lock-in à challenger. |

Les résultats obtenus avec Mistral ne valident pas définitivement la compatibilité Albert.

À réception de la clé Albert, chaque runtime shortlisté devra passer un micro-test dédié : chat, streaming, tokens, `usage.cost`, `usage.impacts`, traces, erreurs/rate limits.

### D. Knowledge / RAG / mémoire documentaire — évaluation différée

Cette famille n’est pas prioritaire pour la phase actuelle. La plupart des runtimes agentiques savent appeler un retriever ou un tool documentaire en démonstration.

Le vrai sujet AnSu n’est pas seulement “peut-on faire du RAG ?”, mais :

- quels documents sont accessibles à quel agent, quelle classe, quel prof ;
- comment tracer les sources utilisées ;
- comment supprimer ou rafraîchir des documents ;
- comment éviter qu’une donnée élève devienne mémoire globale ;
- comment préserver le contrat pédagogique de l’agent naïf malgré les sources.

Pour la phase actuelle, on vérifie seulement que chaque runtime sérieux peut appeler un tool `searchKnowledge`, tracer les sources et contrôler ce qui est injecté dans la réponse.

À approfondir plus tard : Albert knowledge/search, LlamaIndex, LangChain retrievers, Mastra tools/RAG, Postgres/pgvector, Qdrant, Haystack.

## 3. Périmètre POC non négociable

Chaque scénario candidat doit couvrir les must-have suivants :

1. Agent naïf multi-tour.
2. Mémoire de session isolée.
3. Provider Mistral maintenant, Albert dès clé disponible.
4. Traces par session.
5. Scorer pédagogique simple.
6. Dashboard AnSu minimal pour tester.
7. Accès brut ou exportable aux traces/runs.
8. Docker/local reproductible.
9. Versioning minimal dans les metadata.
10. Façade API AnSu stable.

Hors périmètre obligatoire court terme : multi-agent complexe, RAG complet, interface prof finale, versioning avancé, A/B testing par cohorte, SSO complet, evals batch sophistiquées.

Ces fonctionnalités sont valorisées si elles existent out-of-the-box, mais elles restent des bonus.

## 4. Façade API AnSu stable

Tous les runtimes de vague 1 doivent être testés derrière le même contrat API AnSu. Le dashboard et le produit ne doivent pas dépendre directement des abstractions internes de Mastra, LangGraph, Vercel AI SDK ou autre runtime.

Le contrat API AnSu v0 est défini en **TypeScript/Zod** pendant la phase POC afin de garantir une intégration rapide avec Next.js. Lorsqu’un runtime Python séparé est testé, le contrat est exposé ou retranscrit en OpenAPI afin de maintenir l’interopérabilité.

Critères :

- le runtime peut être utilisé sans rendre le produit dépendant de ses abstractions internes ;
- les inputs sont validés ;
- la réponse est normalisée ;
- le front ne dépend pas des abstractions internes du runtime ;
- on peut remplacer le runtime sans changer le contrat produit.

Exemple de réponse normalisée attendue :

```ts
type AgentTurnResponse = {
  runtime: string
  sessionId: string
  runId: string
  traceId?: string
  output: {
    answer: string
    agentId: string
    agentVersion: string
    promptVersion?: string
    model: string
    provider: string
  }
  memory: {
    mode: 'runtime-native' | 'app-managed' | 'none'
    thread: string
    resource: string
  }
  score?: {
    scorerId: string
    scorerVersion?: string
    score: number
    reason: string
  }
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cost?: number
    impacts?: {
      kWh?: number
      kgCO2eq?: number
    }
  }
}
```

## 5. UI Next de test commune

Les runtimes agentiques de vague 1 doivent être testés via une **UI Next de benchmark commune**, minimaliste et comparable. Cette UI n’est pas l’interface prof finale : c’est un banc de test permettant de vérifier le contrat API, la mémoire, les traces, le scoring et la qualité de câblage.

Objectifs :

- utiliser la même expérience de test pour Mastra, Runtime AnSu minimal TS + Vercel AI SDK et LangGraph ;
- éviter que la qualité visuelle ou le niveau de finition d’un POC biaise la comparaison ;
- vérifier que chaque runtime alimente proprement la façade API AnSu ;
- documenter à chaud la DX et les points forts/faibles de chaque solution.

La UI doit rester sobre : console de test, pas showcase. Design minimaliste par défaut : layout simple, peu de couleurs, pas d’animations décoratives, pas d’illustrations, pas d’effets visuels inutiles. La lisibilité, la comparaison entre runtimes et la DX priment sur l’esthétique.

Onglets ou zones minimales :

1. **Test agent**
   - choix du runtime ;
   - session courante / nouvelle session ;
   - transcript local ;
   - textarea message élève ;
   - réponse normalisée ;
   - score pédagogique.
2. **Debug / traces**
   - `sessionId`, `runId`, `traceId` ;
   - provider, modèle, tokens/usage si disponibles ;
   - liens vers Studio / dashboard outil ;
   - request/response brutes.
3. **DX & notes d’évaluation**
   - facilité de câblage ;
   - quantité de code spécifique ;
   - qualité de documentation ;
   - points forts ;
   - points faibles ;
   - pièges rencontrés ;
   - questions ouvertes ;
   - verdict provisoire.

Cet onglet DX peut d’abord être local et manuel : textarea structurée, checklist ou formulaire simple. Il n’a pas besoin d’être un CMS. L’important est de capturer les observations au moment du test, avant de les synthétiser dans les fiches outil/brique/scénario.

La qualité de l’UI n’est pas le sujet du benchmark. La capacité du runtime à alimenter proprement cette UI via la façade API AnSu l’est.

## 6. Protocole de test par catégorie

### A. Protocole runtime agentique

Chaque runtime shortlisté doit implémenter le même mini-agent : agent naïf SVT sur la photosynthèse.

Tests minimaux :

1. Agent multi-tour.
2. Mémoire session isolée.
3. Provider Mistral.
4. Streaming si possible.
5. Tool factice.
6. Guardrail ou post-processing.
7. Scorer pédagogique simple.
8. Traces `sessionId` / `userId`.
9. Versioning minimal metadata.
10. Docker/local reproductible.
11. Façade API AnSu stable.

### B. Protocole observability / evals

Chaque outil observability doit recevoir ou produire le même type de trace : session agent naïf, 2–3 tours, score pédagogique, metadata session/user/matière/version.

Pour les capacités observability natives d’un runtime — par exemple Mastra Observability / Scorers — le test doit isoler cette fonction : on évalue la qualité des traces, scores, exports et APIs, pas la qualité du runtime lui-même.

Tests minimaux :

1. Ingestion ou production de traces.
2. Reconstruction session.
3. Filtre par `sessionId`.
4. Affichage messages/tools/errors.
5. Score custom.
6. Export brut ou accès API exploitable.
7. Comparaison versions ou dataset si disponible.
8. Dashboard custom possible via API/export.
9. Protection du dashboard ou stratégie claire de protection en POC/prod.

### C. Protocole provider

Pendant l’attente de la clé Albert :

1. Appel chat Mistral.
2. Streaming si runtime le supporte.
3. Usage tokens.
4. Erreurs compréhensibles.
5. Traces contenant provider/model/tokens.

Après réception de la clé Albert :

1. Appel chat non-stream.
2. Appel chat stream.
3. Tokens récupérés.
4. `usage.cost` récupéré ou accessible.
5. `usage.impacts` récupéré ou accessible.
6. Trace corrélée session/user.
7. Erreurs/rate limits compréhensibles.

### D. Protocole RAG léger

Pour le moment :

1. Tool `searchKnowledge` mocké ou minimal.
2. Sources visibles dans la trace.
3. Contrôle de l’injection des sources dans la réponse.

## 7. Mode de travail : validation collaborative

Les fiches ne doivent pas être produites comme des documents définitifs rédigés en autonomie. Pour chaque outil, brique ou scénario, les réponses doivent être construites progressivement avec validation humaine.

Processus attendu :

1. **Lister les questions pertinentes** pour la catégorie testée.
2. **Chercher les preuves** : documentation officielle, code du POC, test local, API, capture, logs ou retour d’expérience explicite.
3. **Proposer une réponse courte** avec un statut clair.
4. **Faire une pause de validation** avec Jérémie avant de figer la réponse dans la fiche.
5. **Documenter seulement ce qui est prouvé ou explicitement assumé comme hypothèse.**

Statuts de réponse :

| Statut | Signification |
|---|---|
| Validé | Réponse challengée et acceptée par Jérémie. |
| À confirmer | Indice sérieux, mais pas encore validé ensemble. |
| Incertain | Information insuffisante ou contradictoire. |
| Reporté | Question volontairement différée, par exemple Albert sans clé API. |
| Non applicable | La question ne concerne pas cette catégorie d’outil. |

Règle anti-hallucination :

> Aucune réponse importante ne doit être inventée. Si une information n’est pas prouvée, elle doit rester en `À confirmer`, `Incertain` ou `Reporté`.

## 8. Méthode de notation

La notation se fait en trois couches.

### 8.1 Gates éliminatoires

Format : `OK / KO / Incertain`.

Exemples :

- pilotable depuis une stack TypeScript/backend maîtrisée ;
- données accessibles ou exportables ;
- sessions traçables ;
- provider remplaçable ;
- Docker/local possible ;
- pas de stockage obligatoire des données élèves dans un SaaS non maîtrisé ;
- possibilité de continuer de construire proprement ensuite.

Un `KO` sur un gate critique écarte l’outil ou le limite à un prototype isolé.

### 8.2 Must-have POC

Notation :

| Note | Signification |
|---:|---|
| 0 | Non couvert |
| 1 | Développement spécifique lourd |
| 2 | Développement spécifique raisonnable |
| 3 | Configuration / intégration simple |
| 4 | Natif robuste |

Les must-have sont ceux listés en section 3.

### 8.3 Bonus / trajectoire future

Format : `présent / absent / incertain`.

Exemples : registry agents/prompts, replay de sessions, comparaison de versions, datasets d’évaluation, feedback humain, auth/roles, exports propres, monitoring coût/latence, workflows multi-agent, memory management avancé.

Les bonus ne compensent jamais un échec sur les gates ou must-have critiques.

## 9. Fiches de synthèse attendues

### 9.1 Fiche outil courte

```md
## Outil

- Catégorie principale :
- Capacités secondaires :
- Langage / stack :
- Hébergement :
- Statut dans le benchmark :
- Contraintes notables :
```

### 9.2 Fiche brique

```md
## Brique testée

- Catégorie : runtime / observability / provider / RAG
- Protocole appliqué :
- Résultats must-have :
- Questions structurantes traitées : réponses + statut de validation
- Preuves : liens, captures, endpoints, traces, extraits API
- Validation Jérémie : validé / à confirmer / incertain / reporté
- Limites :
- Risques :
```

### 9.3 Fiche scénario

```md
## Scénario d’architecture

- Runtime :
- Provider :
- Memory :
- Observability / evals :
- Dashboard produit :
- Storage :
- Gates : OK / KO / Incertain
- Score must-have POC :
- Bonus disponibles :
- Risques de trajectoire :
- Décision : retenir / approfondir / prototype seulement / écarter
- Prochaine action :
```

## 10. Questions et critères détaillés

La liste active des questions à résoudre, leurs statuts et leurs réponses consolidées sont centralisées dans [`QUESTIONS_STRUCTURANTES.md`](./QUESTIONS_STRUCTURANTES.md).

Ce choix évite de maintenir deux listes concurrentes de questions. `GRILLE_EVALUATION.md` reste le document de méthode : catégories, protocoles, gates, notation, templates et workflow de validation.

La matière produit plus exhaustive issue du wiki AnSu est conservée dans [`docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md`](../z_archive/FRAMEWORK_EVALUATION_CRITERIA.md), qui sert de banque historique de critères métier. Les questions futures ou bonus importantes ont été remontées dans la section “Questions bonus / trajectoire future” de `QUESTIONS_STRUCTURANTES.md`.

Règle de travail : lorsqu’une question nouvelle apparaît pendant un test, elle doit être ajoutée dans `QUESTIONS_STRUCTURANTES.md` avec un statut plutôt que dispersée dans une fiche isolée.
