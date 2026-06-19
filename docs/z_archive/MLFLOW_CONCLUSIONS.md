# Conclusions provisoires — MLflow pour AnSu v2

## Verdict en une phrase

MLflow est un excellent candidat comme brique **AI engineering**, **prompt registry**, **tracing**, **évaluation** et **preuve d'impact**, mais ce n'est pas un runtime agentique complet ni le registry métier AnSu.

## Recommandation

**À garder dans la stack candidate**, avec un rôle potentiellement proche de Phoenix mais plus orienté MLOps/recherche :

```txt
MLflow = tracking + traces + prompt registry + evals + datasets + non-régression + preuve d'impact
```

MLflow ne doit pas être considéré comme :

```txt
MLflow ≠ runtime agentique complet
MLflow ≠ fabrique d'agents métier AnSu
MLflow ≠ dashboard prof final
MLflow ≠ couche unique de conformité/recherche
```

## Ce que le POC a validé

Un dossier de test a été créé :

```txt
mlflow-genai/
```

Il contient :

- un serveur MLflow self-hosté local ;
- backend SQLite `mlflow.db` ;
- artifact store local `./artifacts` ;
- une app Python fake agent naïf sans clé LLM ;
- instrumentation `@mlflow.trace` ;
- metadata session/user ;
- spans agent, guardrail, retriever, LLM fake, evaluator ;
- prompt registry avec prompt master à variables ;
- évaluation trace-based avec scorer custom ;
- un mini dashboard Next.js `mlflow-genai/dashboard-next` pour tester la façade AnSu.

Commandes testées :

```bash
mlflow server \
  --host 127.0.0.1 \
  --port 5001 \
  --backend-store-uri sqlite:///mlflow.db \
  --default-artifact-root ./artifacts

MLFLOW_TRACKING_URI=http://127.0.0.1:5001 python app.py
python eval_traces.py
```

UI locale :

```txt
http://127.0.0.1:5001
```

## Matrice synthétique

| Critère | Évaluation MLflow | Commentaire |
|---|---|---|
| Bootstrap octobre, agent unique | 🟡 Partiel | Très rapide pour tracer/évaluer un agent, mais il faut construire le runtime. |
| Runtime agentique | ❌ Non | MLflow observe/évalue des agents ; la notion OSS d'agent runtime complet n'est pas centrale. Certaines APIs `Agent` sont Databricks-only. |
| Registry agent métier | ❌ Non | Pas de modèle AnSu natif : posture, séquence, atelier, classe, contrat didactique restent côté AnSu. |
| Prompt master | ✅ Fort | Prompt Registry OSS testé, versioning via `mlflow.genai.register_prompt`. |
| Variables de prompt profs | 🟡 Partiel | Variables `{{...}}` supportées dans les templates, mais schema métier des variables à porter côté AnSu. |
| Modération input/output | 🟡 Observable | Peut tracer et évaluer guardrails ; la logique runtime est à construire. |
| Anti-dérive / naïveté | 🟡 Fort pour eval | Trace-based evaluation très adaptée pour non-régression ; détection/correction runtime à construire. |
| Traces pédagogiques | ✅ Fort | `@mlflow.trace`, sessions, recherche de traces, spans, metadata. |
| Evals / non-régression | ✅ Très fort | `mlflow.genai.evaluate`, scorers custom, trace-based eval, conversation eval. |
| Recherche / preuve d'impact | ✅ Très fort potentiel | Héritage MLOps + datasets + evals + metrics + exports DataFrame. Très bon candidat pour mesure scientifique. |
| Observabilité OpenTelemetry | ✅ Fort | OTLP `/v1/traces`, GenAI semantic conventions, export possible vers backends OTel. |
| Grafana / Tempo | 🟡 Faisable | Docs indiquent export/dual export OTel ; à tester concrètement avec collector. |
| API dashboard Next | 🟡 À cadrer | REST existe, mais SDK Python semble plus naturel pour GenAI. Prévoir backend AnSu/BFF plutôt que Next direct. |
| SecNumCloud / socle compatible | 🟡 Bon potentiel | OSS, Apache-2.0, self-host, Docker/K8s possible, SQL + artifact store. Sécurité/auth prod à vérifier. |
| Licence / open source | ✅ Fort | Apache License 2.0. Avantage net vs licences plus restrictives. |
| Dashboard prof final | ❌ Non | UI MLflow réservée tech/data/produit, pas adaptée aux profs. |

Légende : ✅ bon fit ; 🟡 utile mais incomplet/à cadrer ; ❌ ne couvre pas le besoin.

## Ce que MLflow fait bien

### Prompt Registry

MLflow OSS fournit un prompt registry exploitable :

```python
mlflow.genai.register_prompt(
    name="ansu-agent-naif-master",
    template="Tu es un agent naïf pour {{niveau_scolaire}} en {{matiere}}...",
    commit_message="Initial prompt master",
)
```

Points positifs :

- support des templates string ;
- support des templates chat ;
- variables `{{variable}}` ;
- extraction native des variables via `PromptVersion.variables` testée (`niveau_scolaire`, `matiere`, `notion`) ;
- versions ;
- tags ;
- aliases ;
- model config optionnel ;
- recherche via `mlflow.genai.search_prompts()`.

Différence importante avec Phoenix : le template string fonctionne côté MLflow, alors que Phoenix REST a refusé `STR` pendant le test.

### Tracing GenAI

MLflow propose une instrumentation simple :

```python
@mlflow.trace(name="ansu.single_agent_turn", span_type="AGENT")
def run_agent_turn(...):
    ...
```

Le POC a validé :

- traces par tour agent ;
- spans imbriqués ;
- metadata AnSu ;
- sessions via `mlflow.trace.session` ;
- utilisateur via `mlflow.trace.user` ;
- recherche de traces via `mlflow.search_traces()`.

### Trace-based evaluation

Point très fort pour AnSu : MLflow peut évaluer des traces déjà collectées, sans rejouer le modèle.

POC testé :

```python
@scorer
def no_expert_answer(outputs) -> bool:
    text = str(outputs).lower()
    forbidden = ["voici la réponse", "la photosynthèse est", "en fait"]
    return not any(fragment in text for fragment in forbidden)

result = mlflow.genai.evaluate(data=traces, scorers=[no_expert_answer])
```

Résultat :

```txt
no_expert_answer/mean: 1.0
```

Cela correspond très bien au besoin AnSu : mesurer et prouver que l'agent ne donne pas la réponse.

### Recherche et preuve d'impact

MLflow est historiquement fait pour :

- tracer des expériences ;
- stocker des métriques ;
- comparer des runs ;
- constituer des datasets ;
- exporter en DataFrame ;
- rejouer des évaluations ;
- suivre des non-régressions.

C'est donc un candidat naturel pour la dimension :

```txt
AnSu comme instrument de mesure / étude avec chercheurs partenaires
```

MLflow peut aider à mesurer :

- taux de dérive ;
- taux de refus de réponse directe ;
- qualité des relances ;
- progression des reformulations ;
- qualité conversationnelle ;
- comparaison entre versions d'agent/prompt.

## Ce que MLflow ne fait pas seul

### Pas de runtime agentique AnSu

MLflow ne fournit pas le moteur complet qui :

- rend le prompt métier ;
- exécute le dialogue ;
- appelle Mistral/Albert ;
- applique la modération input/output ;
- corrige une dérive avant affichage ;
- stream la réponse à l'élève ;
- gère la mémoire conversationnelle ;
- applique les règles de publication AnSu.

Il faut donc toujours un runtime agentique : Mastra, LangGraph/LangChain ou autre.

### Pas de modèle métier AnSu

MLflow ne porte pas nativement :

- modèle de séquence ;
- séquence adaptée ;
- posture comme policy métier ;
- garde-fou comme objet métier ;
- atelier ;
- classe ;
- consentement ;
- configurateur prof ;
- marketplace ;
- contrat didactique.

Ces concepts doivent rester dans la DB/backend AnSu.

### Certaines fonctionnalités GenAI avancées sont Databricks-only ou expérimentales

La documentation signale que plusieurs objets sont Databricks-only :

- `mlflow.genai.Agent` ;
- Review App ;
- LabelingSession ;
- certaines formes de monitoring/scorers planifiés.

Cela ne bloque pas le POC OSS, mais c'est un point d'attention : ne pas baser la décision SecNumCloud/socle sur une fonctionnalité disponible uniquement dans Databricks.

## Stockage et déploiement

Dans le POC :

```txt
mlflow.db      # SQLite
artifacts/     # artifact store local
```

Tables observées :

- `trace_info`
- `spans`
- `assessments`
- `runs`
- `params`
- `metrics`
- `registered_models`
- `model_versions`
- `evaluation_datasets`
- `scorers`
- `scorer_versions`

Le Prompt Registry est stocké via les tables du Model Registry :

```txt
registered_models / model_versions
```

Pour production, MLflow supporte classiquement :

- backend SQL ;
- artifact store S3-compatible ;
- Docker/Kubernetes ;
- tracking server distant.

Point sécurité à vérifier : le serveur open source local est simple, mais la sécurisation production/auth/proxy doit être cadrée sérieusement.

## API et intégration Next

Un mini dashboard Next.js a été câblé dans `mlflow-genai/dashboard-next` et lancé sur `http://localhost:3008`.

Pages validées : `/`, `/traces`, `/traces/:traceId`, `/prompts`, `/evals`, `/research`.

MLflow dispose d'une REST API sous `/api/2.0/mlflow/...`, et les traces GenAI sont accessibles via `POST /api/3.0/mlflow/traces/search`. Pour les capacités GenAI modernes comme prompts/traces enrichies, le SDK Python reste toutefois la voie la plus naturelle.

Routes observées/testées :

| Besoin | Route / méthode | Statut POC |
|---|---|---|
| UI MLflow | `/` | ✅ OK |
| UI Gateway | `/#/gateway` | ✅ Visible |
| Search experiments | `POST /api/2.0/mlflow/experiments/search` | ✅ OK |
| Search runs | `POST /api/2.0/mlflow/runs/search` | ✅ OK |
| Search traces GenAI | `POST /api/3.0/mlflow/traces/search` | ✅ OK |
| OTLP ingest | `POST /v1/traces` avec `x-mlflow-experiment-id` | 🟡 À tester avec collector |
| AI Gateway OpenAI-compatible | `/gateway/mlflow/v1/...` | 🟡 Documenté, pas encore testé |
| Ancien Gateway invoke | `/gateway/{route}/invocations` | 🟡 Documenté legacy |
| Prompt Registry | SDK `mlflow.genai.*` | ✅ OK via SDK |

Le dashboard Next utilise donc deux chemins :

```txt
Next Server Components
  → REST MLflow pour experiments/runs
  → scripts/mlflow_bridge.py pour prompts/traces/research via SDK Python
```

Cette architecture illustre le BFF AnSu : le front ne dépend pas directement de toutes les subtilités REST/SDK MLflow.

Conséquence AnSu :

```txt
Dashboard Next → Backend/BFF AnSu → SDK/REST MLflow
```

Plutôt que :

```txt
Dashboard Next → MLflow REST direct
```

Cela colle de toute façon avec nos besoins de :

- droits métier ;
- anonymisation ;
- consentement ;
- exports chercheurs ;
- schema variables profs.

## Comparaison rapide avec Phoenix

| Sujet | Phoenix | MLflow |
|---|---|---|
| Licence | Elastic License 2.0 | Apache-2.0 |
| Positionnement | Observabilité/evals LLM | AI engineering / MLOps / GenAI evals |
| Tracing OTel | Très fort | Très fort |
| Prompt registry | Partiel, REST rugueux | Fort, OSS testé |
| Templates string | Refusés côté REST testé | Supportés |
| Trace-based eval | Oui, experiments/evals | Très fort via `mlflow.genai.evaluate` |
| UI produit tech | Très orientée LLM traces | Très orientée ML/Data/experiments |
| Runtime agent | Non | Non |
| Recherche/preuve impact | Bon potentiel | Très bon potentiel |
| Simplicité UX non-tech | Phoenix plus spécialisé LLM | MLflow plus dense/MLOps |

## Risques

| Risque | Niveau | Mitigation |
|---|---|---|
| Confondre MLflow avec runtime agentique | Élevé | Le positionner comme tracking/evals/prompt registry. |
| Dépendre d'APIs Databricks-only | Élevé | Vérifier chaque feature en OSS self-host avant adoption. |
| UI trop technique pour produit/non-tech | Moyen | Garder UI MLflow pour tech/data ; dashboard prof dans Next. |
| Package complet lourd | Faible à moyen | Utiliser `mlflow-tracing` en production si tracing seul. |
| Auth/sécurité serveur OSS | Moyen | Déploiement derrière proxy/auth socle ; revue DevSecOps. |
| Données élèves dans traces | Élevé | Redaction/pseudonymisation côté runtime AnSu. |

## Décision provisoire

MLflow mérite clairement de rester dans la comparaison. Il pourrait même être plus fort que Phoenix pour :

- prompt registry ;
- evals systématiques ;
- recherche/preuve d'impact ;
- licence et socle OSS.

Mais comme Phoenix, MLflow ne suffit pas seul. La question structurante reste le runtime agentique :

```txt
Runtime agentique + MLflow ?
Runtime agentique + Phoenix ?
Runtime agentique + Phoenix + MLflow ?
```

Une combinaison possible à investiguer :

```txt
LangGraph/Mastra → OpenTelemetry → MLflow pour evals/recherche
```

ou :

```txt
Runtime agentique → OTel Collector → Phoenix + MLflow
```

Mais il faudra éviter de dupliquer inutilement Phoenix et MLflow si un seul suffit.

## Prochaines vérifications MLflow

Avant décision finale :

1. tester export/ingestion OTLP avec OTel Collector ;
2. tester instrumentation TypeScript / Vercel AI SDK si Mastra/Next ;
3. tester vrai appel Mistral ou Albert via LiteLLM / provider compatible ;
4. tester backend PostgreSQL + artifact store S3/MinIO ;
5. vérifier auth/permissions production OSS ;
6. vérifier les APIs GenAI disponibles en OSS vs Databricks-only ;
7. tester datasets GenAI avec records et expectations ;
8. tester exports anonymisés pour chercheurs ;
9. comparer l'ergonomie UI avec Phoenix pour la team produit.
