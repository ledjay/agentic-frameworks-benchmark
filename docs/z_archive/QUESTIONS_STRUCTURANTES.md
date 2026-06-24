# Questions structurantes v2 — benchmark agentique AnSu

> Statut : tableau de pilotage v2 aligné sur la méthode playground-first.

## 1. Rôle de ce document

Ce fichier suit les questions qui doivent être résolues pour choisir une architecture AnSu v2. La grille complète est dans [`GRILLE_EVALUATION.md`](./GRILLE_EVALUATION.md).

Principe :

```txt
seed = debug/remplissage, non décisionnel
mock = dev/debug, non décisionnel
fake = baseline UI, hors benchmark
preuve benchmark = playground + runtime réel + gateway/model réel + observability réelle
```

## 2. Statuts et niveaux de preuve

| Statut | Signification |
|---|---|
| `Validé benchmark` | Testé via playground réel + accepté |
| `Validé technique` | POC/seed/mock concluant, utile mais non décisionnel |
| `À confirmer` | Preuve incomplète |
| `Incertain` | Info manquante/contradictoire |
| `Reporté` | Différé volontairement |
| `Non applicable` | Hors périmètre |

| Preuve | Signification |
|---|---|
| `Doc` | Documentation officielle |
| `Technique isolée` | Seed/POC/mock/fake spécifique outil |
| `Playground réel` | Test via `pocs/playground` avec runtime réel + provider réel + observability réelle |
| `Capture` | Screenshot intégré dans la doc |
| `Validation Jérémie` | Décision acceptée en séance |

## 3. Questions transversales T

| ID | Question | Réponse consolidée | Statut | Preuve |
|---|---|---|---|---|
| T1* | Le benchmark est-il désormais playground-first ? | Oui. Le playground commun devient référence ; les seeds isolés restent preuves techniques. | Validé benchmark | `METHODO_PLAYGROUND.md`, validation Jérémie |
| T2* | Peut-on comparer runtime × observability × llm gateway × model ? | Oui côté contrat et UI ; LangGraph TS + Langfuse validé, Mastra/LangGraph Python/MLflow/Phoenix à compléter. | À confirmer | Playground |
| T3* | Le produit reste-t-il derrière une façade AnSu stable ? | Objectif validé méthodo ; à vérifier runtime par runtime. | À confirmer | `TurnRequest/RuntimeResult/TraceResult` |
| T4* | Qu’est-ce qui reste source de vérité métier ? | AnSu/Postgres doit rester source de vérité ; observability = miroir technique. | À confirmer | fiches B à compléter |
| T5* | Quels outils sont validés benchmark aujourd’hui ? | Aucun combo final n’est encore validé benchmark strict. Langfuse + LangGraph TS prouvent le câblage, mais avec comportement déterministe ; Mastra/LangGraph Python ont preuves techniques solides à repasser en réel. | À confirmer | smoke tests non décisionnels |
| T6* | Peut-on tracer partout runtime, gateway, model, promptVersion, score ? | Validé avec LangGraph TS → Langfuse ; à généraliser. | À confirmer | trace Langfuse |
| T7 | Peut-on protéger dashboards et traces sensibles ? | À traiter outil par outil. | À confirmer | fiches B |
| T8 | Quelle interface est assez claire pour Thomas/Mathieu/Jérémie ? | Nouveau critère B13. | À confirmer | revue UI en séance |

## 4. Questions A — runtimes agentiques

| ID | Question | Runtime concerné | Réponse courte | Statut | Preuve |
|---|---|---|---|---|---|
| A1* | Le runtime exécute-t-il le même agent naïf canonique ? | fake | Oui, mais dev/debug only. | Non applicable | Technique isolée |
| A1* | Le runtime exécute-t-il le même agent naïf canonique ? | langgraph-typescript | Graphe canonique backend-only, mais comportement réel LLM à valider. | À confirmer | Technique isolée |
| A1* | Le runtime exécute-t-il le même agent naïf canonique ? | mastra | Oui en POC ; à repasser playground. | Validé technique | POC Mastra |
| A1* | Le runtime exécute-t-il le même agent naïf canonique ? | langgraph-python | Oui en POC ; à repasser playground. | Validé technique | POC Python |
| A2* | Pipeline `moderate → retrieve → generate → score` exposé ? | Tous | Contrat canonique posé dans `RUNTIME_CAPABILITIES.md`. | À confirmer | Playground/raw |
| A3* | Mémoire isolée session/user ? | Mastra | Validé historiquement via `thread/resource`. | Validé technique | fiche Mastra |
| A3* | Mémoire isolée session/user ? | LangGraph Python | Validé historiquement via `thread_id` composite, ownership à cadrer. | Validé technique | fiche LangGraph Python |
| A3* | Mémoire isolée session/user ? | LangGraph TS | Pas encore mémoire persistante ; backend actuellement déterministe/stateless. | À confirmer | POC TS |
| A4* | Façade AnSu stable ? | Tous | Playground impose la façade ; à valider sur services lancés. | À confirmer | `pocs/playground/src/contract` |
| A5* | LLM gateway/model propagés ? | LangGraph TS | Propagation validée, mais pas encore appel LLM réel. | Validé technique | trace Langfuse non décisionnelle |
| A5* | LLM gateway/model propagés ? | Mastra/Python | Payload ajouté ; à revalider en service. | À confirmer | code adapters |
| A6* | Metadata trace complètes ? | LangGraph TS + Langfuse | Oui sur smoke technique ; à confirmer en combo réel. | Validé technique | Langfuse |
| A7* | Scorer `ansu_naivety` ? | Tous | Présent dans contrat ; à valider en combo réel. | À confirmer | Playground réel |
| A8* | Tool `searchKnowledge` ? | Tous | Canonique dans raw ; tool réel à revalider runtime par runtime. | À confirmer | `RUNTIME_CAPABILITIES.md` |
| A9* | Structured output ? | Mastra/Python | Validé historiquement ; à intégrer playground si nécessaire. | Validé technique | fiches runtime |
| A10 | Streaming ? | Tous | Non prioritaire pour l’après-midi. | Reporté | — |
| A11 | Guardrails/repair ? | Tous | Guardrail score présent ; repair avancé à tester plus tard. | À confirmer | runtime docs |
| A12* | DX et maintenabilité ? | Tous | À noter pendant sweep playground. | À confirmer | séance |
| A13* | Docker/local reproductible ? | Mastra/Python/TS | Builds OK ; services à relancer selon besoin. | À confirmer | task/build |
| A14* | Portabilité métier ? | Tous | Objectif de la façade ; à valider fiche par fiche. | À confirmer | synthèse runtime v2 |

## 5. Questions B — observability / evals / prompt management

| ID | Question | Outil | Réponse courte | Statut | Preuve |
|---|---|---|---|---|---|
| B1* | Self-host / souveraineté ? | Langfuse | Oui, self-host Docker/K8s ; stack lourde. | Validé technique | POC + docs |
| B2* | Ingestion playground ? | Langfuse | Oui en smoke technique ; à confirmer avec runtime/provider réels. | Validé technique | trace Langfuse |
| B3* | Trace agentique lisible ? | Langfuse | Oui en smoke technique ; capture et combo réel à produire. | À confirmer | UI/ClickHouse |
| B4* | Filtre session/runtime/model ? | Langfuse | Metadata présentes ; filtre UI/API à confirmer en séance. | À confirmer | trace metadata |
| B5* | Score custom ? | Langfuse | Oui en smoke technique ; à confirmer avec combo réel. | À confirmer | score trace |
| B6* | Evals/datasets/non-régression ? | Langfuse | Fonctionnalités disponibles, non testées playground. | À confirmer | Doc/à tester |
| B7* | Export API ? | Langfuse | API/ClickHouse accessibles, export à qualifier proprement. | À confirmer | POC |
| B8* | Coût/tokens/impacts ? | Langfuse | Usage/cost natifs, impacts metadata ; vrais champs Albert à tester. | À confirmer | POC |
| B9 | Structured outputs ? | Langfuse | JSON inputs/outputs stockés ; filtrage à confirmer. | À confirmer | POC |
| B10* | Prompt management ? | Langfuse | À tester explicitement. | À confirmer | — |
| B11* | Prompt versioning ? | Langfuse | À tester explicitement. | À confirmer | — |
| B12* | Prompt variables ? | Langfuse | À tester explicitement. | À confirmer | — |
| B13* | Clarté UI ? | Langfuse | Plutôt bonne pour trace agentique ; à noter en séance. | À confirmer | revue UI |
| B14* | Sécurité/prod ? | Langfuse | À cadrer : K8s/Helm, auth/RBAC/licence. | À confirmer | docs |
| B15* | Portabilité métier ? | Langfuse | Doit rester miroir observability. | À confirmer | méthodo |
| B16* | DX intégration ? | Langfuse | Très bonne TS/OTel déjà observée. | Validé technique | adapter playground |
| B2* | Ingestion playground ? | MLflow | Non câblé. | À confirmer | adapter à faire |
| B4* | Trace/evals techniques ? | MLflow | Très fort en seed isolé et eval trace-based. | Validé technique | fiche MLflow |
| B10* | Prompt management ? | MLflow | Prompt Registry validé en POC isolé. | Validé technique | fiche MLflow |
| B11* | Prompt versioning ? | MLflow | Versions prompt validées en POC isolé. | Validé technique | fiche MLflow |
| B12* | Prompt variables ? | MLflow | Variables template détectées/chargées en POC isolé. | Validé technique | fiche MLflow |
| B13* | Clarté UI ? | MLflow | UI MLOps dense ; à noter explicitement. | À confirmer | revue UI |
| B2* | Ingestion playground ? | Phoenix | Non câblé. | À confirmer | adapter à faire |
| B10–B13 | Prompt/UI | Phoenix | À réévaluer ; POC historique insuffisant v2. | À confirmer | fiche à créer |

## 6. Questions C — LLM gateway / model

| ID | Question | Réponse courte | Statut | Preuve |
|---|---|---|---|---|
| C1* | Le front peut-il choisir gateway/model ? | Oui : `albert`, `mistral`, `openai-compatible` + model libre ; `mock` reste dev only. | Validé technique | playground UI/API |
| C2* | Le choix est-il envoyé au runtime ? | Oui dans adapters ; validé LangGraph TS. | À confirmer | smoke TS |
| C3* | Le choix est-il dans la trace ? | Oui en smoke technique avec LangGraph TS + Langfuse ; à confirmer en combo réel. | Validé technique | ClickHouse/Langfuse |
| C4* | Albert réel ? | À tester selon disponibilité clé/API. | Reporté | — |
| C5* | Coût/impacts Albert réels ? | À tester sur runtime + observability. | Reporté | — |

## 7. Questions D — Knowledge / RAG léger

| ID | Question | Réponse courte | Statut | Preuve |
|---|---|---|---|---|
| D1 | `searchKnowledge` existe-t-il partout ? | Canonique dans le raw playground ; réel validé historiquement Mastra/Python. | À confirmer | runtime sweep |
| D2 | Sources visibles dans trace ? | Oui dans trace canonique Langfuse via tool output ; à généraliser. | À confirmer | Langfuse |
| D3 | Sources contrôlées dans réponse ? | Prompt/posture le demande, RAG réel reporté. | Reporté | — |

## 8. Captures d’écran dans la validation

Chaque validation UI importante doit idéalement produire une capture.

| Cas | Capture attendue |
|---|---|
| B3 trace lisible | arbre de trace avec spans agent/LLM/tool/guardrail |
| B4 filtre session/runtime/model | écran ou requête montrant le filtre |
| B5 score custom | score attaché à la trace/session |
| B10 prompt management | écran prompt registry / détail prompt |
| B11 prompt versioning | versions/tags/rollback ou historique |
| B12 prompt variables | template + variables + preview/compile |
| B13 clarté UI | vue principale annotée par avis en séance |

Stockage : `docs/benchmark-agentique/assets/screenshots/`.

## 9. Priorités de l’après-midi

1. Revalider Mastra depuis playground.
2. Revalider LangGraph Python depuis playground.
3. Tester prompt management/versioning/variables dans Langfuse.
4. Décider si on câble MLflow adapter playground ou si MLflow reste `Validé technique` pour aujourd’hui.
5. Repasser Phoenix ou le marquer explicitement `À confirmer v2`.
6. Régénérer les synthèses runtime/observability avec niveaux de preuve.

## 10. Template de réponse rapide

```md
### <ID> — <question>

**Outil/runtime :** ...
**Réponse courte :** ...
**Statut :** Validé benchmark / Validé technique / À confirmer / Reporté
**Niveau de preuve :** Playground / Technique isolée / Doc
**Preuves :**
- commande : ...
- traceId : ...
- screenshot : ...
- fichier : ...
**Décision Jérémie :** ...
```
