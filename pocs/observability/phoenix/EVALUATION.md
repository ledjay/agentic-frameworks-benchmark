# Évaluation provisoire — Arize Phoenix
> **Statut : POC historique.** Ce document ne vaut pas validation dans la nouvelle grille observability/evals. Phoenix doit être repassé avec `docs/benchmark-agentique/TRACES_PRIORITAIRES.md`.


## Verdict court

Phoenix semble être une **très bonne brique d'observabilité/evals LLM**, mais pas un framework agentique complet.

Pour AnSu v2, il faut l'évaluer comme un composant à brancher sur LangChain, Vercel AI SDK, Mastra, LangGraph, etc., pas comme le moteur métier unique.

## Fit avec le POC AnSu

| Critère | Évaluation provisoire |
| --- | --- |
| Un seul agent | Oui, via instrumentation du framework agentique choisi. Phoenix observe, il n'orchestre pas. |
| Modération in/out | Pas le cœur produit, mais spans `GUARDRAIL` et evals permettent de tracer/modéliser les décisions. Intégration Guardrails mentionnée côté OpenInference. |
| Observabilité | Très fort : OpenTelemetry/OpenInference natif, UI dédiée aux traces LLM. |
| UI produit vs UI profs | L'UI Phoenix serait réservée à la team produit pour inspecter/debugger. Les profs auront un dashboard Next.js spécifique. |
| API pour dashboard Next.js | Critère critique : l'API doit permettre de lire traces/spans/sessions, créer/lire annotations/evals/feedback, exploiter datasets/experiments et exposer ces données dans notre propre dashboard. |
| Evals | Très fort côté Python ; TypeScript existe mais indiqué alpha côté `@arizeai/phoenix-evals`. |
| OpenTelemetry -> Grafana | Bon potentiel : ingestion OTLP HTTP/gRPC, serveur instrumentable, Prometheus possible. Pour Grafana Tempo, prévoir fan-out via OTel Collector. |
| Provider flexibility | Bon : Phoenix observe des spans standard. Mistral/OpenAI/LiteLLM/Bedrock/etc. supportés via instrumentations ou wrappers. |
| Versioning agent | Pas directement versioning d'agent complet ; plutôt datasets, experiments, prompt management/tags. À compléter par conventions applicatives. |
| Multi-agents futur | Observable via spans agent/tool/chain ; orchestration externe nécessaire. |
| Compatibilité DevSecOps Thomas | Docker/Kubernetes/Helm possibles, env vars claires, Prometheus possible. À valider avec contraintes de stack et persistance Postgres/SQLite. |
| Open source | Source disponible mais licence **Elastic License 2.0**, donc pas OSS permissif Apache/MIT. Self-host possible. Cloud Arize optionnel. |

## Points forts

- Très aligné avec notre besoin d'observabilité LLM.
- Repose sur OpenTelemetry + OpenInference : bon signal de portabilité.
- Self-host local simple via Docker.
- Ports/ingestion standards : HTTP `/v1/traces`, gRPC `4317`.
- Packages Python matures : tracing, client, evals.
- Intégrations nombreuses : LangChain, LlamaIndex, Vercel AI SDK, Mastra, CrewAI, MistralAI, LiteLLM, etc.
- Peut servir d'outil d'analyse pendant la phase benchmark elle-même.

## Points de vigilance

- Ce n'est pas un orchestrateur agentique.
- Licence ELv2 : vérifier ce que ça implique pour beta.gouv/Éducation Nationale et l'exploitation long terme.
- Les evals avancées semblent surtout matures côté Python.
- L'API REST existe mais Phoenix semble historiquement avoir aussi une API GraphQL mature. Pour un dashboard Next.js, il faudra vérifier si REST suffit ou si un backend-for-frontend doit consommer GraphQL/clients Phoenix côté serveur.
- Le lien avec Grafana/Tempo n'est pas “un bouton magique” : il faut designer le chemin OTel Collector.
- Les features de prompt management/playground peuvent être très utiles, mais il faut vérifier lesquelles restent confortables en self-host.
- Besoin de stratégie PII : traces LLM peuvent contenir prompts, réponses, données sensibles.

## Questions ouvertes

1. Est-ce qu'on veut Phoenix comme backend principal de traces LLM, ou seulement comme outil de debug/eval non-prod ?
2. Est-ce que Grafana/Tempo doit être la source de vérité observabilité, Phoenix étant une vue métier LLM ?
3. Est-ce que la licence ELv2 est acceptable pour AnSu ?
4. Est-ce qu'on accepte une brique Python dans le workflow evals si l'app v2 est principalement TypeScript/Next ?
5. Quelle politique de rétention/anonymisation des traces faut-il imposer ?
6. L'API REST suffit-elle pour le dashboard profs Next.js, notamment pagination/filtres/écritures d'annotations, ou faut-il assumer GraphQL côté serveur ?
7. Quel niveau d'accès product team vs profs : Phoenix UI interne uniquement, dashboard profs via API/BFF uniquement ?

## Prochain test recommandé

Brancher Phoenix sur une vraie exécution LLM Mistral, puis vérifier :

- qualité des spans auto LangChain,
- attributs tokens/modèle/latence,
- capacité à tracer les guardrails/modération,
- lisibilité dans Phoenix UI,
- export/fan-out vers OTel Collector + Tempo.
- capacité à récupérer les mêmes données depuis une route Next.js serveur pour alimenter un dashboard profs sans exposer Phoenix directement.
- extension POC dashboard Next validée : prompts/versions/tags, critères via annotation configs, datasets/experiments/runs/evaluations mockées. Limite observée : prompt REST accepte `CHAT` mais refuse `STR`; `ModelProvider` prompt management ne liste pas Mistral/Albert malgré tracing Mistral via OpenInference.
