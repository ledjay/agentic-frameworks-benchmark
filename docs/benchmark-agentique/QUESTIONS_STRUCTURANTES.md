# Questions structurantes du benchmark agentique AnSu

> **Statut : document de pilotage.** Ces questions ne sont pas décoratives : chaque réponse doit être construite avec preuves, challengée avec Jérémie, puis reportée dans les fiches outil/brique/scénario et dans la synthèse finale.

## 1. Rôle de ce document

Ce fichier sert à suivre les questions qui guident le benchmark, à éviter les comparaisons d’outils “au feeling”, et à consolider progressivement les réponses.

Il complète [`GRILLE_EVALUATION.md`](./GRILLE_EVALUATION.md) :

- `GRILLE_EVALUATION.md` définit la **méthode**, les catégories, les protocoles, les gates et les templates de fiches ;
- `QUESTIONS_STRUCTURANTES.md` liste les **questions prioritaires** et suit leur réponse ;
- les fiches outil/brique/scénario apportent les **preuves détaillées** ;
- `SYNTHESE.md` reprendra seulement les questions/réponses principales pour Mathieu et Thomas.

## 2. Workflow de réponse

Pour chaque outil ou scénario :

1. Sélectionner les questions pertinentes dans ce fichier.
2. Chercher les preuves : doc officielle, code du POC, test local, API, logs, capture, snippet.
3. Proposer une réponse courte avec statut.
4. Faire une pause de validation avec Jérémie.
5. Reporter la réponse validée dans la fiche concernée.
6. Consolider les réponses transverses dans ce fichier.

Règle anti-hallucination :

> Si une information n’est pas prouvée ou validée, elle reste `À confirmer`, `Incertain` ou `Reporté`.

## 3. Statuts utilisés

| Statut | Signification |
|---|---|
| `Validé` | Réponse challengée et acceptée avec Jérémie. |
| `À confirmer` | Indice sérieux, mais preuve ou validation encore insuffisante. |
| `Incertain` | Information manquante, contradictoire ou non testée. |
| `Reporté` | Question volontairement différée, par exemple Albert sans clé API. |
| `Non applicable` | La question ne concerne pas cette catégorie d’outil. |

## 4. Priorisation shortlist

Les questions marquées `*` sont les questions de shortlist : elles sont traitées en premier pour décider quels outils méritent un approfondissement.

Workflow :

1. Répondre d’abord aux questions `*`.
2. Shortlister les outils/scénarios.
3. Ne traiter les questions non étoilées que pour les candidats shortlistés.
4. Garder les questions `Reporté` visibles, sans bloquer la vague actuelle quand la cause est externe — par exemple absence de clé Albert.

## 5. Questions transversales

Ces questions s’appliquent aux scénarios d’architecture et structurent la synthèse finale.

| ID | Question | Pourquoi c’est important | Réponse consolidée | Statut | Sources / fiches |
|---|---|---|---|---|---|
| T1* | Peut-on livrer rapidement un POC agent naïf crédible sans salir la trajectoire ? | Principe “POC rapide, trajectoire propre”. | À renseigner après comparaison des scénarios. | À confirmer | `SCENARIOS.md` à créer |
| T2* | Le produit peut-il rester derrière une façade API AnSu stable ? | Évite que le front dépende des abstractions Mastra/LangGraph/Vercel AI SDK. | À renseigner runtime par runtime. | À confirmer | `./GRILLE_EVALUATION.md#4-façade-api-ansu-stable` |
| T3* | Peut-on continuer de construire proprement ensuite si le POC réussit ? | Évite la logique throwaway/rewrite. | À renseigner par scénario. | À confirmer | fiches scénario à créer |
| T4* | Les données critiques sont-elles accessibles/exportables ? | Condition anti lock-in : sessions, traces, scores, prompts, configs. | À renseigner par brique. | À confirmer | fiches observability/runtime |
| T5 | Les bonus out-of-the-box créent-ils un vrai avantage sans risque de cul-de-sac ? | Les bonus ne compensent pas les must-have faibles. | À renseigner par scénario. | À confirmer | fiches scénario |
| T6* | Le scénario reste-t-il compatible avec Albert comme provider cible ? | Albert est cible institutionnelle, Mistral est provider temporaire. | Tests détaillés reportés à réception de clé Albert. | Reporté | section C ci-dessous |
| T7 | Peut-on protéger les dashboards internes et les traces sensibles ? | Studio/debug ne doit pas exposer de données élèves. | À renseigner par outil/scénario. | À confirmer | fiches observability/runtime |
| T8* | L’équipe pourra-t-elle comprendre, débugger et maintenir le runtime ? | Complexité cognitive et DX sont des critères forts. | À documenter dans l’onglet DX de l’UI benchmark. | À confirmer | UI Next benchmark à créer/stabiliser |
| T9* | Quelle donnée va dans la base métier AnSu, quelle donnée va dans l’outil observability, et comment les deux sont corrélées ? | Postgres doit rester source de vérité produit ; l’outil obs sert au debug/evals. Corrélation par `sessionId`, `turnId`, `runId`, `traceId`. | À confirmer | SCENARIOS.md / fiches observability à créer |

## 6. Questions A — Runtimes agentiques

Ces questions servent à tester les runtimes : Mastra, Runtime AnSu minimal TS + Vercel AI SDK, LangGraph/LangChain Python derrière API AnSu.

| ID | Question | Réponse attendue dans chaque fiche runtime | Statut global |
|---|---|---|---|
| A1* | Le runtime permet-il de faire tourner un agent naïf multi-tour ? | Oui/non/partiel + preuve sur 2 tours. | À confirmer |
| A2* | La mémoire de session est-elle isolée par `sessionId` / `userId` ? | Mode mémoire, persistance, isolation, preuve de non-mélange. | À confirmer |
| A3* | Peut-on utiliser Mistral maintenant, puis Albert plus tard ? | Provider abstraction, base URL OpenAI-compatible, limites connues. | À confirmer |
| A4* | Peut-on utiliser ce runtime sans rendre le produit dépendant de ses abstractions internes ? | Quantité de wrapper, fuite ou non des abstractions internes. | À confirmer |
| A5* | Peut-on tracer `sessionId`, `userId`, `agentVersion`, `promptVersion`, provider et modèle ? | Metadata présentes dans traces ou export. | À confirmer |
| A6* | Peut-on brancher un scorer pédagogique simple ? | Scorer local/framework, timing, stockage du score. | À confirmer |
| A7* | Le runtime permet-il de produire du structured output ? | JSON/schema/Zod, validation et stabilité de sortie. | À confirmer |
| A8* | Peut-on définir, appeler et tracer un tool avec une bonne DX ? | Déclaration tool, validation input/output, appel par l’agent, trace résultat, facilité de câblage. | À confirmer |
| A9 | Le streaming est-il possible sans perdre traces et contrôle ? | Streaming vers UI + trace complète. | À confirmer |
| A10 | Peut-on appliquer des guardrails avant/après réponse ? | Blocage, réécriture, scoring, auditabilité. | À confirmer |
| A11* | Quelle est la DX de câblage ? | Code à écrire, pièges, docs, debug, temps de mise en place. | À confirmer |
| A12* | Le runtime est-il Docker/local reproductible ? | Commande de lancement + seed + healthcheck. | À confirmer |
| A13* | Si on remplace ce runtime, le métier AnSu reste-t-il portable ? | Contrats API, prompts, schémas, scoring métier et providers doivent rester hors du runtime autant que possible. | À confirmer |

## 7. Questions B — Observability / evals / feedback

Ces questions servent à tester Phoenix, MLflow, Mastra Observability/Scorers, LangSmith, Langfuse et Promptfoo. Elles sont complétées par la checklist [`TRACES_PRIORITAIRES.md`](./TRACES_PRIORITAIRES.md), qui liste les signaux critiques à tracer pour Mathieu et Thomas.

| ID | Question | Réponse attendue dans chaque fiche observability/eval | Statut global |
|---|---|---|---|
| B1* | Peut-on reconstruire une session complète ? | Affichage ou export des tours, spans, scores, erreurs. | À confirmer |
| B2* | Peut-on filtrer par `sessionId`, utilisateur, matière, agent, version ? | UI/API/export + preuve. | À confirmer |
| B3* | Peut-on stocker ou afficher un score pédagogique custom ? | Scorer custom, annotation, metric, dataset ou eval. | À confirmer |
| B4 | Peut-on comparer plusieurs versions d’agent/prompt ? | Dataset, experiment, prompt registry, tags/versions. | À confirmer |
| B5* | Peut-on exporter les traces et scores dans un format exploitable ? | JSON, SQL, CSV, OpenTelemetry, API. | À confirmer |
| B6* | Peut-on reconstruire un dashboard AnSu custom depuis l’API/export ? | Accessibilité des données brutes. | À confirmer |
| B7 | Peut-on intégrer un feedback humain/prof ? | Annotation, tags, modération, transformation en cas d’eval. | À confirmer |
| B8* | Peut-on suivre et visualiser coût, tokens, impacts, latence et erreurs ? | Ingestion + affichage des champs provider : tokens, `usage.cost`, `usage.impacts`, latence, erreurs. | À confirmer |
| B9* | Quelles fonctions nécessitent une offre enterprise ou SaaS ? | Licence, self-host, feature gates. | À confirmer |
| B10* | Le dashboard est-il protégeable en POC/prod ? | Auth native, reverse proxy, RBAC, audit logs. | À confirmer |
| B11* | La brique est-elle utile au produit ou seulement au debug développeur ? | Usage équipe produit/tech/recherche, lisibilité. | À confirmer |
| B12* | Les données de coût/impact Albert sont-elles récupérables, filtrables et visualisables dans l’outil ? | Vérifier explicitement que `usage.cost`, `usage.impacts.kWh`, `usage.impacts.kgCO2eq` ne restent pas seulement dans la réponse API brute. | À confirmer |
| B13* | Si on n’utilise pas le Studio/observability de l’outil, les traces/scores/exports restent-ils portables ? | Séparer décision runtime et décision observability : UI Studio, spans, logs, scores API, exports, datasets. | À confirmer |
| B14* | L’outil couvre-t-il les traces critiques définies dans `TRACES_PRIORITAIRES.md` sans devenir la source de vérité métier ? | Vérifier la couverture des signaux critiques, l’export, et la corrélation avec la base métier AnSu. | À confirmer |

## 8. Questions C — Provider / Albert / Mistral

Albert est le provider cible pressenti. Mistral est le provider de test actuel et fallback potentiel à revalider.

| ID | Question | Réponse attendue | Statut global |
|---|---|---|---|
| C1* | Le runtime peut-il appeler Mistral proprement ? | Chat, erreurs, tokens, traces. | À confirmer |
| C2* | Le runtime peut-il appeler Albert via API OpenAI-compatible ? | À tester à réception de clé. | Reporté |
| C3 | Le streaming fonctionne-t-il avec Albert ? | À tester à réception de clé. | Reporté |
| C4* | Les champs `usage.cost` Albert sont-ils conservés ou récupérables ? | À tester à réception de clé. | Reporté |
| C5* | Les champs `usage.impacts` Albert sont-ils conservés ou récupérables ? | À tester à réception de clé. | Reporté |
| C6* | Le provider peut-il être remplacé sans changer le produit ? | Vérifier abstraction dans la façade API AnSu. | À confirmer |
| C7 | Les coûts affichés sont-ils réels, estimés ou reconstruits ? | Source de vérité : provider, gateway, pricing table, billing. | À confirmer |

## 9. Questions D — Knowledge / RAG / mémoire documentaire

Cette catégorie est différée. Pour l’instant, on vérifie seulement la compatibilité légère des runtimes avec un tool documentaire.

| ID | Question | Réponse attendue | Statut global |
|---|---|---|---|
| D1 | Le runtime peut-il appeler un tool `searchKnowledge` ? | Tool mocké/minimal + trace. | À confirmer |
| D2 | Peut-on tracer les sources utilisées ? | IDs documents, chunks, métadonnées sources. | À confirmer |
| D3 | Peut-on contrôler ce qui est injecté dans la réponse ? | Éviter que le RAG casse la posture naïve. | À confirmer |
| D4 | Peut-on isoler les documents par classe/prof/activité ? | À approfondir plus tard. | Reporté |
| D5 | Peut-on supprimer/rafraîchir des documents proprement ? | À approfondir plus tard. | Reporté |
| D6 | Albert knowledge/search peut-il couvrir ce besoin ? | À tester si disponible et si clé/API reçue. | Reporté |

## 10. Questions par scénario

Ces questions seront consolidées dans `SCENARIOS.md` lorsque les fiches brique seront suffisamment avancées.

| ID | Question | Réponse attendue | Statut |
|---|---|---|---|
| S1* | Scénario Mastra intégré : suffit-il pour le POC sans observability dédiée ? | Résolu/partiel/ouvert + risques. | À confirmer |
| S2 | Scénario Mastra + observability dédiée : quel gain vs complexité ? | Comparaison avec Mastra native. | À confirmer |
| S3* | Scénario Runtime AnSu minimal TS + Vercel AI SDK : assez rapide ou trop de runtime à construire ? | POC à réaliser. | À confirmer |
| S4* | Scénario LangGraph Python derrière API AnSu : solidité vs coût d’intégration Python ? | POC à réaliser. | À confirmer |
| S5* | Quel scénario est favori pour le POC octobre ? | Shortlist argumentée, pas matrice neutre. | À confirmer |
| S6* | Quel scénario est fallback crédible ? | À déterminer après tests. | À confirmer |
| S7* | Quelles options sont à écarter court terme ? | À déterminer après tests. | À confirmer |
| S8* | En scénario hybride, la compatibilité runtime ↔ plateforme observability/evals est-elle validée en premier ? | Gate prioritaire avant approfondissement : vérifier instrumentation, traces, scores, tool calls, structured outputs, coût/impacts Albert et IDs de corrélation entre runtime et outil obs/evals. | À confirmer |

## 12. Template de réponse par question

À utiliser dans les fiches ou lors des pauses de validation.

```md
### Question

**ID :** A1  
**Question :** Le runtime permet-il de faire tourner un agent naïf multi-tour ?

**Réponse proposée :** ...

**Statut :** À confirmer / Validé / Incertain / Reporté / Non applicable

**Preuves :**
- Doc officielle : ...
- Code : ...
- Test local : ...
- Capture/log : ...

**Validation Jérémie :** ...

**À reporter dans :** fiche runtime / questions transversales / scénario
```

## 11. Questions bonus / trajectoire future

Ces questions ne sont pas toutes obligatoires pour le POC court terme, mais elles doivent rester visibles pour vérifier que le scénario retenu permet de continuer de construire proprement ensuite. Elles proviennent de la banque de critères produit détaillée conservée dans [`docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md`](../../docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md).

| ID | Question | Pourquoi c’est important | Statut global |
|---|---|---|---|
| F1 | Peut-on créer, cloner, désactiver ou archiver un agent sans redéployer tout le produit ? | Prépare la future fabrique d’agents et la marketplace. | À confirmer |
| F2 | Peut-on associer un agent ou une séquence à une classe, matière, activité ou tenant ? | Nécessaire pour passer du POC à des usages enseignants réels. | À confirmer |
| F3 | Peut-on évoluer vers versioning avancé, rollback, comparaison de versions et cohorte test ? | Non obligatoire POC, mais critique pour amélioration continue et déploiements maîtrisés. | À confirmer |
| F4 | Peut-on exécuter des evals online, offline, batch et pré-déploiement ? | Permet de passer du score ponctuel à une vraie non-régression. | À confirmer |
| F5 | Peut-on bloquer ou alerter avant release si une régression critique est détectée ? | Important pour industrialiser la qualité agentique. | À confirmer |
| F6 | Peut-on collecter, taguer, modérer et transformer le feedback prof en cas d’évaluation ? | Boucle produit essentielle : signalement → dataset → correction → mesure. | À confirmer |
| F7 | Peut-on suivre coût, tokens, latence p95, erreurs, tools fragiles et boucles agentiques ? | Nécessaire pour piloter coûts, robustesse et performance en production. | À confirmer |
| F8 | Peut-on évoluer vers droits fins, audit, pseudonymisation, rétention et suppression utilisateur ? | Données élèves et conformité institutionnelle. | À confirmer |
| F9 | Peut-on déployer proprement en dev/staging/prod avec gestion des secrets, CI/CD et monitoring infra ? | Prépare l’exploitation avec Thomas. | À confirmer |
| F10 | Le runtime permet-il validation humaine, suspension/reprise ou approval avant action sensible ? | Bonus futur pour tools sensibles et workflows complexes. | À confirmer |
| F11 | Peut-on tester ou rejouer une session passée sur une nouvelle version d’agent ? | Utile pour regression testing et comparaison d’approches. | À confirmer |
| F12 | Peut-on distinguer clairement outil de debug développeur et outil produit exploitable par l’équipe ? | Évite de livrer un cockpit technique inutilisable par produit/recherche/profs. | À confirmer |
| F13 | Peut-on utiliser un editor/registry pour versionner et faire évoluer agents/prompts sans redéploiement ? | Piste Mastra Editor : drafts, published, archived, rollback, version targeting, source `code` ou `db`. À tester avant recommandation finale si Mastra reste favori. | À confirmer |
