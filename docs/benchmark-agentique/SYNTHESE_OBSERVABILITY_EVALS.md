# Synthèse observability / evals — AnSu v2

> Statut : document de partage et de prise de décision.  
> Objet : comparer **MLflow**, **Phoenix** et **Langfuse** pour l’observability et les évaluations AnSu.  
> Méthode : valider les critères **B1 à B11** un par un, avec captures ou éléments observés quand nécessaire, puis formuler une recommandation.

LangSmith et la plateforme associée à Mastra ne sont pas inclus dans ce comparatif principal. Ce sont pourtant les solutions les plus intégrées à leurs runtimes respectifs : LangSmith pour LangChain/LangGraph, et la plateforme Mastra pour Mastra. Elles restent donc utiles pour le debug et le développement.

La raison de leur exclusion est différente : le benchmark cherche ici une plateforme d’observability / evals **souveraine, déployable sur notre propre infrastructure, open source ou compatible avec un usage sans abonnement obligatoire**. Or, même si les runtimes LangChain/LangGraph et Mastra sont open source, leurs plateformes d’évaluation associées ne répondent pas à ce critère de la même manière que MLflow, Phoenix ou Langfuse. Elles sont donc traitées comme références utiles, mais pas comme candidates principales pour cette décision.

## 1. Décision à prendre

AnSu doit choisir une brique d’observability / evals capable de suivre un agent naïf en conditions proches du POC octobre.

Cette brique doit aider l’équipe à répondre à des questions simples :

- que s’est-il passé pendant un tour agentique ?
- quel modèle et quelle version de prompt ont été utilisés ?
- quels outils ont été appelés ?
- quelle réponse a été donnée à l’élève ?
- le comportement respecte-t-il le contrat pédagogique ?
- combien le tour a-t-il coûté en tokens, coût et impact quand ces données existent ?
- peut-on comparer les versions d’agent et détecter des régressions ?

La décision ne porte pas sur le runtime agentique lui-même. Les choix de runtime sont traités dans [`SYNTHESE_RUNTIME.md`](./SYNTHESE_RUNTIME.md).

## 2. Frontière produit

L’outil observability peut stocker des traces techniques utiles, mais il ne doit pas devenir la source de vérité métier AnSu.

La source de vérité métier doit rester côté AnSu :

- classes, ateliers, séquences ;
- configuration prof ;
- posture et garde-fous publiés ;
- consentements, données sensibles et règles de rétention ;
- sessions et messages canoniques ;
- exports chercheurs validés.

L’outil observability sert à inspecter, évaluer, comparer et exporter. Il ne doit pas remplacer le produit AnSu ni devenir le dashboard métier des enseignants.

## 3. Architecture du benchmark

Le benchmark observability est volontairement centré sur un runtime unique :

```txt
LangGraph Python
```

Ce choix évite de comparer trop de combinaisons en même temps. L’objectif est de vérifier si chaque plateforme reçoit des traces utiles depuis un même graphe agentique.

Architecture testée :

```txt
Playground AnSu
  └─ LangGraph Python observability runtime
       ├─ MLflow   : runtime :3021 → UI :5001
       ├─ Phoenix  : runtime :3022 → UI :6006
       └─ Langfuse : runtime :3023 → UI :3012
```

Le graphe métier testé reste simple :

```txt
agent_turn
  ├─ llm_call
  ├─ tool_node / searchKnowledge si l’élève demande un indice
  └─ final_response
```

Le score pédagogique `ansu_naivety` est calculé **après** le graphe métier. Il ne fait pas partie du graphe agentique principal. Cette séparation évite de biaiser la comparaison des traces : le graphe montre le comportement de l’agent, l’évaluation reste une couche observability / evals.

## 4. Matrice d’évaluation

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
| B10 | Production technique | Peut-on exploiter l’outil techniquement en production ? |
| B11 | Accès équipe / droits | Peut-on gérer facilement les accès des membres de l’équipe ? |

## 5. Validation question par question

### B1 — Peut-on héberger l’outil sur une infrastructure maîtrisée ?

Réponse courte : les trois outils sont lançables en local/self-host. Les différences portent surtout sur la licence et la lourdeur d’exploitation.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Self-host simple dans le POC. Licence Apache 2.0. Pas de blocage identifié pour un usage interne AnSu. |
| Phoenix | Validé avec réserve licence | Self-host validé dans le POC. Licence Elastic License 2.0 : acceptable pour un usage interne probable, mais à valider juridiquement selon l’usage final. |
| Langfuse | Validé avec réserve infra / open-core | Self-host validé dans le POC. Le cœur est sous licence MIT, mais certaines fonctions Enterprise sont sous licence commerciale. Stack plus lourde : Postgres, ClickHouse, Redis et MinIO. |

Éléments observés :

- les trois plateformes répondent en local : MLflow `:5001`, Phoenix `:6006`, Langfuse `:3012` ;
- les runtimes LangGraph Python dédiés répondent aussi : MLflow `:3021`, Phoenix `:3022`, Langfuse `:3023` ;
- Docker Desktop a dû être augmenté à environ 12 GiB RAM et 8 CPU pour faire tourner tous les services en parallèle ;
- licences vérifiées dans les dépôts publics : MLflow Apache 2.0, Phoenix Elastic License 2.0, Langfuse MIT pour le cœur avec dossier Enterprise séparé.

Conclusion B1 :

```txt
MLflow est le plus simple à héberger.
Phoenix est techniquement self-host, mais sa licence doit être relue.
Langfuse est self-host et adapté au POC, mais demande plus d’infrastructure.
```

### B2 — L’outil s’intègre-t-il correctement au runtime agentique utilisé par AnSu ?

Réponse courte : les trois outils ont été testés avec **LangGraph Python**, choisi volontairement comme runtime exigeant à tracer. Un graphe agentique produit naturellement plusieurs étapes : appels LLM, décisions de routage, appels tools, résultats tools, réponse finale. C’est donc un bon test pour vérifier si une plateforme comprend une exécution agentique structurée.

Cette validation ne veut pas dire que tous les runtimes possibles sont validés. Si AnSu choisit finalement Mastra, LangGraph TypeScript ou un runtime custom, il faudra refaire une passe d’intégration dédiée.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé sur LangGraph Python | Intégration native via `mlflow.langchain.autolog()`. Les traces LangGraph et les appels tools remontent dans MLflow. À revalider si runtime TypeScript ou Mastra. |
| Phoenix | Validé sur LangGraph Python | Intégration native via OpenTelemetry/Phoenix avec auto-instrumentation. Les traces LangGraph et les appels tools remontent dans Phoenix. À revalider si runtime TypeScript ou Mastra. |
| Langfuse | Validé sur LangGraph Python | Intégration via callback LangChain/LangGraph. Les traces, tool calls et scores peuvent être rattachés à la trace Langfuse. À revalider si runtime TypeScript ou Mastra. |

Constat visuel important :

- dans MLflow, la structure LangGraph ressort clairement dans la trace ;
- dans Langfuse, la structure LangGraph ressort aussi clairement ;
- dans Phoenix, les traces remontent bien, mais l’interface ne restitue pas vraiment le graphe LangGraph : le concept de graphe est pratiquement ignoré visuellement.

Point important : LangGraph Python a été utilisé comme runtime de test parce qu’il est plus complexe qu’un simple appel LLM linéaire. Le résultat est donc encourageant, mais il ne remplace pas une validation runtime par runtime.

Conclusion B2 :

```txt
Les trois plateformes savent recevoir des traces depuis un runtime graph-native complexe.
La validation est solide pour LangGraph Python.
Elle devra être rejouée si le runtime produit final est différent.
```

### B3 — Peut-on lire clairement les traces agentiques ?

Réponse courte : MLflow et Langfuse permettent de lire clairement un tour LangGraph avec appels LLM et tool call. Phoenix reçoit bien les traces, mais ne restitue pas clairement le graphe agentique dans son interface.

Le scénario utilisé force un appel tool :

```txt
Est-ce qu’on peut chercher un indice sur la photosynthèse ?
```

Trace attendue :

```txt
agent_turn
  ├─ llm_call
  ├─ tool_node
  ├─ searchKnowledge
  ├─ llm_call
  └─ final_response
```

| Outil | Statut | Synthèse | Captures |
|---|---|---|---|
| MLflow | Validé | La trace hiérarchique est lisible. La structure LangGraph ressort bien : `llm_call`, `tool_node`, `searchKnowledge`, second `llm_call`. | [liste](./assets/screenshots/2026-06-23__B3__mlflow__traces-list__langgraph-python-mistral.png), [détail](./assets/screenshots/2026-06-23__B3__mlflow__trace-detail__langgraph-python-mistral.png) |
| Phoenix | Partiel | Les traces remontent et les spans existent, mais l’interface ne rend pas vraiment le graphe LangGraph. Pour comprendre le déroulé agentique, la lecture est moins directe. | [liste](./assets/screenshots/2026-06-23__B3__phoenix__traces-list__langgraph-python-mistral.png), [détail](./assets/screenshots/2026-06-23__B3__phoenix__trace-detail__langgraph-python-mistral.png) |
| Langfuse | Validé | La trace est lisible et orientée produit LLM. Les observations permettent de suivre le tour, les générations et le tool call. | [liste](./assets/screenshots/2026-06-23__B3__langfuse__traces-list__langgraph-python-mistral.png), [détail](./assets/screenshots/2026-06-23__B3__langfuse__trace-detail__langgraph-python-mistral.png) |

Captures :

#### MLflow

| Liste des traces | Détail d’une trace |
|---|---|
| ![B3 — MLflow, liste des traces LangGraph](./assets/screenshots/2026-06-23__B3__mlflow__traces-list__langgraph-python-mistral.png) | ![B3 — MLflow, détail d’une trace LangGraph avec tool call](./assets/screenshots/2026-06-23__B3__mlflow__trace-detail__langgraph-python-mistral.png) |

#### Phoenix

| Liste des traces | Détail d’une trace |
|---|---|
| ![B3 — Phoenix, liste des traces](./assets/screenshots/2026-06-23__B3__phoenix__traces-list__langgraph-python-mistral.png) | ![B3 — Phoenix, détail d’une trace](./assets/screenshots/2026-06-23__B3__phoenix__trace-detail__langgraph-python-mistral.png) |

#### Langfuse

| Liste des traces | Détail d’une trace |
|---|---|
| ![B3 — Langfuse, liste des traces LangGraph](./assets/screenshots/2026-06-23__B3__langfuse__traces-list__langgraph-python-mistral.png) | ![B3 — Langfuse, détail d’une trace LangGraph avec tool call](./assets/screenshots/2026-06-23__B3__langfuse__trace-detail__langgraph-python-mistral.png) |

Conclusion B3 :

```txt
MLflow et Langfuse sont les plus lisibles pour inspecter un tour agentique LangGraph.
Phoenix est exploitable techniquement, mais moins convaincant pour lire visuellement le graphe.
```

À l’usage, MLflow et Langfuse sont tous les deux agréables pour explorer une trace. Phoenix semble plus orienté data / analyse technique. Cela le rend moins lisible pour des personnes non techniques, et moins confortable pour les profils techniques qui veulent simplement comprendre rapidement le déroulé d’un tour agentique.

### B4 — Peut-on stocker et exploiter des scores / evals ?

Réponse courte : oui, les trois outils couvrent les deux besoins : afficher des scores sur des traces et lancer des évaluations sur des datasets. La différence principale se joue sur la lisibilité et le temps de paramétrage.

#### Scores sur les traces

Un score sert à qualifier un tour précis, par exemple : “l’agent a-t-il respecté le contrat de naïveté pédagogique ?”.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé, mais moins lisible | Le score peut être remonté dans les traces / évaluations. En revanche, il est moins directement mis en avant dans l’interface et demande plus d’effort pour relier le score au tour agentique analysé. |
| Phoenix | Validé, mais moins lisible | Le score peut être représenté via spans / attributs d’évaluation. Mais il reste assez dissocié de la lecture principale de la trace, ce qui rend l’analyse moins fluide. |
| Langfuse | Validé | Le score est le mieux intégré visuellement. Il est rattaché à la trace et clairement mis en avant dans l’interface. C’est le plus confortable pour analyser rapidement si un tour respecte le contrat pédagogique. |

#### Datasets et campagnes d’évaluation

Un dataset sert à conserver des cas de test, puis à rejouer ces cas pour comparer plusieurs versions d’agent, de prompt ou de modèle.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Permet de constituer des datasets et de lancer des évaluations. C’est un point fort historique de MLflow, notamment pour les usages expérimentation, comparaison et non-régression. |
| Phoenix | Validé | Permet de créer des datasets à partir de traces et de lancer des évaluations. L’approche est utile, mais reste plus orientée analyse technique. |
| Langfuse | Validé, avec avantage pratique | Permet de créer des datasets à partir de traces et de lancer des évaluations. L’interface est lisible et la banque d’évaluateurs prédéfinis accélère le paramétrage des premières campagnes. |

C’est important pour AnSu : les cas réels intéressants pourront devenir des jeux de non-régression pour comparer plusieurs versions d’agent ou de prompt.

Langfuse a un avantage pratique sur ce point : il propose une banque d’évaluateurs prédéfinis. Cela peut faire gagner beaucoup de temps au moment de paramétrer les premières campagnes d’evals, avant de créer des évaluateurs spécifiques à AnSu.

Conclusion B4 :

```txt
Les trois plateformes peuvent gérer un score pédagogique.
Les trois permettent aussi de constituer des datasets et de lancer des sessions d’évaluation.
Langfuse est nettement le plus lisible pour exploiter ce score dans l’interface.
Langfuse a aussi un avantage de démarrage grâce à ses évaluateurs prédéfinis.
MLflow et Phoenix restent utilisables, mais les scores sont plus difficiles à relier naturellement à la trace analysée.
```

### B5 — Peut-on stocker et relire les sorties structurées ?

Réponse courte : oui, les trois outils permettent de stocker et relire une sortie structurée. La différence se joue surtout sur la lisibilité dans l’interface.

Le cas testé est une évaluation structurée de transcript, avec un objet `NotionAssessment` contenant notamment :

- les notions évaluées ;
- le statut de compréhension ;
- une justification courte ;
- l’indication `readyForNextStep` ;
- la méthode de génération / validation.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | La sortie structurée est bien stockée et relisible. L’interface permet de retrouver l’objet, mais la lecture reste assez technique. Lisibilité correcte, derrière Langfuse. |
| Phoenix | Validé, mais moins lisible | La sortie structurée est bien présente, mais elle est moins mise en valeur dans l’interface. La lecture demande plus d’effort, surtout pour une personne non spécialiste de l’outil. |
| Langfuse | Validé | La sortie structurée est la plus lisible. L’objet est plus facile à retrouver et à comprendre dans le contexte de la trace. C’est l’expérience la plus confortable pour analyser rapidement le résultat métier. |

Classement de lisibilité observé :

```txt
Langfuse > MLflow > Phoenix
```

Conclusion B5 :

```txt
Les trois plateformes savent conserver une sortie structurée.
Langfuse est le plus lisible pour relire le résultat métier.
MLflow est exploitable mais plus technique.
Phoenix fonctionne, mais la lecture est la moins confortable.
```

### B6 — Peut-on tracer les tokens, coûts et impacts Albert ?

Réponse courte : les tokens sont correctement visibles dans MLflow et Langfuse. Dans Phoenix, ils ne remontent pas correctement pour le moment, probablement à cause d’un câblage OpenTelemetry à ajuster. Les coûts et impacts Albert sont bien récupérés par le runtime, mais ne sont pas encore affichés clairement dans les dashboards.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Partiel, bon sur tokens | Les tokens ressortent correctement dans l’interface. Les champs Albert spécifiques (`cost`, `impacts.kWh`, `impacts.kgCO2eq`) sont récupérés côté runtime, mais doivent être poussés explicitement en metadata custom pour être plus lisibles. |
| Phoenix | Partiel | Les données existent côté runtime, mais les tokens ne remontent pas correctement dans l’interface pour le moment. C’est probablement un sujet de mapping / câblage OpenTelemetry. Les champs coût et impact devront aussi passer par des attributs custom. |
| Langfuse | Partiel, bon sur tokens | Les tokens ressortent correctement dans l’interface, au même niveau que MLflow. Les champs coût et impact Albert peuvent être ajoutés via metadata custom, et éventuellement via `usage_details` / `cost_details` pour la partie usage/coût. |

Le câblage coût / impact Albert ne semble pas bloquant. Les trois outils permettent d’ajouter des métadonnées custom :

- MLflow via metadata de trace ou attributs de span ;
- Langfuse via metadata de trace, span ou génération ;
- Phoenix via attributs OpenTelemetry.

La difficulté principale n’est donc pas d’envoyer la donnée, mais de la rendre lisible et exploitable dans l’interface.

Niveau de difficulté estimé :

```txt
Langfuse : facile
MLflow   : facile à moyen
Phoenix  : moyen, surtout à cause de la lisibilité dans l’interface
```

Conclusion B6 :

```txt
Les tokens sont validés dans MLflow et Langfuse.
Phoenix devra être recâblé pour afficher correctement les tokens.
Les coûts et impacts Albert sont récupérés par le runtime, mais doivent être normalisés et poussés comme metadata custom.
Ce point n’est pas bloquant, mais il avantage MLflow et Langfuse sur la lisibilité.
```

### B7 — Peut-on suivre les prompts et leurs versions ?

Réponse courte : oui, les trois plateformes savent gérer des prompts et leur versioning. Sur ce point, Phoenix ressort comme le plus agréable et le plus complet à l’usage.

Le besoin AnSu n’est pas seulement de stocker un texte de prompt. Il faut pouvoir suivre un prompt comme un objet de production :

- retrouver quelle version a été utilisée ;
- comparer plusieurs versions ;
- utiliser des variables dans les prompts ;
- relier une version de prompt aux traces et aux évaluations ;
- faire évoluer un prompt sans perdre l’historique.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Gère les prompts et le versioning. Solide pour une logique d’expérimentation, de comparaison et de non-régression. L’expérience reste plus orientée engineering. |
| Phoenix | Validé fort | Sur ce point, Phoenix est le mieux intégré. Son gestionnaire de prompts propose davantage de fonctionnalités et se révèle plus agréable à utiliser que les autres. |
| Langfuse | Validé | Gère les prompts, le versioning et les variables. L’expérience est claire et cohérente avec le reste de l’outil, mais moins riche que Phoenix sur ce point précis. |

Conclusion B7 :

```txt
Les trois plateformes savent gérer les prompts et leur versioning.
Phoenix est le meilleur sur la gestion de prompts : plus complet et plus agréable à utiliser.
MLflow est solide mais plus orienté engineering.
Langfuse est clair et bien intégré, mais moins avancé que Phoenix sur ce point.
```

### B8 — Peut-on exporter les données et éviter le lock-in ?

Réponse courte : oui, les trois plateformes proposent des APIs permettant de récupérer les données. Phoenix est le plus “standard” dans sa représentation des données, car il s’appuie fortement sur OpenTelemetry / OpenInference et expose des exports très orientés data. MLflow et Langfuse sont aussi exportables, mais avec des modèles de données plus propres à leur plateforme.

Pour AnSu, le point clé est de ne pas faire de l’outil observability la source de vérité métier. Les traces doivent rester reliées à AnSu via des IDs stables : `sessionId`, `userId`, `agentVersion`, `promptVersion`, `runId`, etc.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Très bon côté APIs Python et logique MLOps : `search_traces`, `search_runs`, `search_experiments`, prompt registry. Les données sont faciles à extraire pour une équipe technique, notamment en DataFrame / JSON. Le modèle reste toutefois spécifique à MLflow. |
| Phoenix | Validé fort sur portabilité data | C’est le plus standard dans sa donnée : traces/spans OpenTelemetry, conventions OpenInference, API REST documentée, exports datasets en CSV / JSONL, formats OpenAI evals / fine-tuning, exports experiments en CSV / JSON. Moins agréable en UI, mais très bon pour éviter le lock-in data. |
| Langfuse | Validé | API publique claire pour traces, scores, datasets et prompts. Très pratique pour un usage produit observability. Le modèle de données est plus spécifique à Langfuse, donc il faut éviter de faire dépendre AnSu directement de ses objets internes. |

Éléments vérifiés :

- Langfuse expose localement des endpoints publics pour les traces, scores, datasets et prompts ;
- Phoenix expose une OpenAPI locale avec traces, spans, annotations, datasets, experiments, prompts et versions ;
- Phoenix propose aussi des exports dataset en `csv`, `jsonl`, `openai_evals`, `openai_ft` ;
- MLflow expose des APIs Python matures pour chercher et exporter traces, runs, experiments et prompts.

Conclusion B8 :

```txt
Les trois plateformes permettent de récupérer les données.
Phoenix est le plus standard et le plus portable côté format data.
MLflow est très exportable pour une équipe technique, mais avec un modèle MLflow.
Langfuse est très pratique via API, mais son modèle est plus produit / plateforme.
Dans tous les cas, AnSu doit garder sa propre base métier comme source de vérité.
```

### B9 — L’intégration est-elle simple à développer et maintenir ?

Réponse courte : les trois intégrations sont faisables, mais elles ne demandent pas le même type d’effort. La question ici est de savoir ce qui sera le plus simple à brancher, comprendre, débugger et maintenir dans la durée.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Intégration LangGraph/LangChain assez directe. Peu d’infra à maintenir comparé à Langfuse. Bon choix pour les développeurs, mais moins immédiat pour une personne produit : il faut souvent ouvrir les détails techniques d’une trace pour comprendre ce qui s’est passé. |
| Phoenix | Partiel | Base très standard grâce à OpenTelemetry / OpenInference, mais demande plus de réglages pour que les bonnes données ressortent clairement. Exemple : les tokens Albert ne remontent pas encore correctement dans l’interface. |
| Langfuse | Validé avec réserve infra | SDK et API pratiques pour une app LLM : traces, metadata, scores et sorties structurées sont assez simples à pousser. En revanche, l’infra self-host est la plus lourde : Postgres, ClickHouse, Redis, MinIO, worker, web. |

Lecture par type d’effort :

```txt
MLflow   : le plus simple à maintenir côté développeurs.
Langfuse : le plus simple à intégrer côté application LLM, mais infra plus lourde.
Phoenix  : le plus standard côté data, mais demande plus de mapping pour une intégration lisible.
```

Conclusion B9 :

```txt
Ce critère ne départage pas à lui seul le meilleur outil final.
MLflow rassure côté maintenance développeurs, mais demande plus d’effort de lecture pour un profil produit.
Langfuse rassure côté intégration applicative LLM, avec une réserve infra.
Phoenix rassure côté standards, mais demande plus de travail de câblage fin.
```

### B10 — Peut-on exploiter l’outil techniquement en production ?

Réponse courte : les trois outils sont exploitables, mais pas avec le même coût infra.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé | Stack la plus simple : un serveur MLflow, un stockage à cadrer, et l’interface. C’est le plus léger à opérer techniquement. |
| Phoenix | Validé avec cadrage production | Stack plutôt légère aussi. Le point d’attention principal est le bon câblage des données envoyées : traces, tokens, metadata, scores. |
| Langfuse | Validé avec réserve infra forte | Stack la plus lourde : application web, worker, base relationnelle, base analytique, cache et stockage objet. Plus complet, mais plus coûteux à exploiter. |

Conclusion B10 :

```txt
MLflow est le plus simple à opérer.
Phoenix reste léger, mais demande un câblage data plus précis.
Langfuse est le plus complet, mais aussi le plus lourd côté infra.
```

### B11 — Peut-on gérer facilement les accès des membres de l’équipe ?

Réponse courte : oui, les trois plateformes permettent de gérer des accès utilisateurs et des droits. À ce stade, seul Langfuse a été testé réellement dans le POC, car la gestion des utilisateurs y est activée par défaut. Pour MLflow et Phoenix, la validation repose sur la documentation.

| Outil | Statut | Synthèse |
|---|---|---|
| MLflow | Validé sur documentation | La documentation MLflow décrit une authentification avec utilisateurs, rôles et permissions. Ce n’est pas activé dans notre configuration locale actuelle : il faut lancer MLflow avec l’application `basic-auth` et installer les dépendances nécessaires. |
| Phoenix | Validé sur documentation | Phoenix documente une gestion des accès et des droits. Le POC local n’a pas été configuré pour tester finement ces droits. À valider dans la configuration cible si Phoenix est retenu. |
| Langfuse | Validé en POC | La gestion des utilisateurs est disponible directement dans l’interface testée. Langfuse permet de gérer les membres et les droits de manière plus immédiate dans notre installation locale. |

Point à investiguer plus tard : si AnSu a besoin d’un SSO, notamment Keycloak / OIDC, il faudra vérifier précisément la solution choisie. Les fonctionnalités SSO ou RBAC avancées peuvent dépendre du mode de déploiement ou d’une édition payante selon l’outil.

Conclusion B11 :

```txt
Les trois plateformes semblent capables de gérer des accès équipe.
Langfuse est le seul validé concrètement dans le POC local.
MLflow et Phoenix sont validés sur documentation, mais restent à tester dans une configuration reproductible.
Le SSO / Keycloak devra être étudié séparément une fois l’outil choisi.
```

## 6. Comparatif final

Cette synthèse ne reprend pas tout le détail des questions B1 à B11. Elle sert à faire ressortir la lecture décisionnelle.

| Outil | Ce qu’il fait le mieux | Ce qui coûte / limite | Lecture finale |
|---|---|---|---|
| Langfuse | Lecture quotidienne des traces agentiques, scores bien visibles, sorties structurées lisibles, expérience confortable pour l’équipe. | Infra la plus lourde à opérer. SSO / droits avancés à vérifier si besoin. | Favori pour l’observability agentique produit du POC. |
| MLflow | Simplicité infra, analyses automatisées par les développeurs, évaluations, non-régression, exports. | Moins immédiat pour une lecture produit. Les scores et sorties structurées demandent plus d’effort de lecture. | Candidat solide pour evals / non-régression / infra simple. |
| Phoenix | Données standards, exports, portabilité, très bon gestionnaire de prompts. | Traces agentiques moins lisibles, graphe LangGraph peu restitué visuellement, câblage tokens/metadata à affiner. | Très bon socle data, moins convaincant comme outil de lecture quotidienne des traces. |

Classement par usage :

| Usage prioritaire | 1er choix | 2e choix | 3e choix |
|---|---|---|---|
| Lire rapidement ce qu’a fait l’agent | Langfuse | MLflow | Phoenix |
| Exploiter / exporter les données | Phoenix | MLflow | Langfuse |
| Limiter l’effort infra | MLflow | Phoenix | Langfuse |
| Gérer les prompts et leurs versions | Phoenix | Langfuse | MLflow |
| Lancer des evals et jeux de non-régression | Langfuse / MLflow | Phoenix | — |

Lecture synthétique :

```txt
Langfuse gagne sur l’usage quotidien et la lisibilité agentique.
MLflow gagne sur la simplicité infra et les analyses automatisées par les développeurs.
Phoenix gagne sur la portabilité data et la gestion des prompts.
```

## 7. Recommandation

Recommandation provisoire : retenir **Langfuse** comme candidat principal pour l’observability agentique du POC octobre.

Pourquoi : pour un POC, le besoin principal est de comprendre vite ce que fait l’agent, relire une trace, voir les scores, relire une sortie structurée et partager ces constats dans l’équipe. Sur ce point, Langfuse est le plus confortable.

Cette recommandation garde deux nuances :

- **MLflow** reste une très bonne option si la priorité devient l’évaluation technique, la non-régression et une infra plus simple ;
- **Phoenix** reste intéressant comme référence data / prompts, mais il n’est pas recommandé comme solution principale pour le POC. Son interface est beaucoup moins lisible sur les traces agentiques. Il ne redeviendrait candidat sérieux que si la gestion avancée de prompts devenait le cœur du besoin.

Conditions à vérifier avant décision finale :

- complexité de mise en œuvre de Langfuse sur l’infra Scaleway : déploiement, maintenance, sauvegarde et restauration de la stack ;
- gestion des accès équipe et éventuel besoin SSO / Keycloak ;
- câblage explicite des coûts et impacts Albert en metadata custom ;
- capacité à garder AnSu comme source de vérité métier, sans dépendre des objets internes Langfuse.

Conclusion de décision :

```txt
Choix recommandé pour le POC, sous réserve de faisabilité technique : Langfuse.
Option forte si priorité evals / infra simple : MLflow.
Option à garder seulement si priorité data standard / gestion avancée des prompts : Phoenix.
```

## 8. Points à vérifier avant mise en œuvre

La recommandation pointe vers Langfuse, mais elle reste conditionnée à quelques vérifications concrètes.

1. **Faisabilité infra Langfuse sur Scaleway**  
   Vérifier le déploiement, la maintenance, les sauvegardes et la restauration de la stack Langfuse.

2. **Accès équipe et SSO éventuel**  
   La gestion des membres fonctionne dans Langfuse. Si AnSu a besoin de Keycloak / OIDC / SSO, il faudra vérifier précisément ce qui est disponible dans le mode de déploiement retenu.

3. **Données sensibles et rétention**  
   Définir ce qui peut être envoyé dans les traces, ce qui doit être anonymisé, combien de temps les traces sont conservées et qui peut les consulter.

4. **Coûts et impacts Albert**  
   Les tokens remontent correctement dans Langfuse et MLflow. Les champs `cost` et `impacts` doivent être câblés explicitement comme metadata custom pour être lisibles. Ce n’est pas crucial pour le POC, mais c’est un bon cas d’école : si l’outil sait intégrer proprement ces métadonnées personnalisées, il sera plus facile d’ajouter d’autres métadonnées métier AnSu ensuite.

5. **Runtime final**  
   Le test a été fait avec LangGraph Python, volontairement choisi comme runtime complexe. Si le POC part finalement sur Mastra, LangGraph TypeScript ou un autre runtime, il faudra simplement rejouer la validation d’intégration avec le runtime retenu. Le repo contient déjà le playground et les scénarios nécessaires pour refaire ce test rapidement.

6. **Plan B**  
   Si Langfuse se révèle trop lourd à déployer ou maintenir, MLflow reste l’alternative la plus crédible. Phoenix reste à garder seulement si la priorité devient la gestion avancée de prompts ou la portabilité data.

## 9. Annexes utiles

### Méthode de benchmark

- [`GRILLE_EVALUATION.md`](./GRILLE_EVALUATION.md) — grille complète utilisée pour cadrer les critères.
- [`QUESTIONS_STRUCTURANTES.md`](./QUESTIONS_STRUCTURANTES.md) — questions de décision par catégorie.
- [`TRACES_PRIORITAIRES.md`](./TRACES_PRIORITAIRES.md) — informations attendues dans les traces AnSu.

### Comparaison liée

- [`SYNTHESE_RUNTIME.md`](./SYNTHESE_RUNTIME.md) — synthèse séparée sur les runtimes agentiques. À ne pas mélanger avec la décision observability / evals.
