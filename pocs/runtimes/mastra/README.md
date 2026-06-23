# POC Mastra Runtime + Next — AnSu v2

Ce POC teste Mastra comme **runtime agentique** pour AnSu : agent multi-tour, mémoire native, Studio, scorers, observability native et stockage local. Le dashboard Next consomme une façade API locale plutôt que l’API Mastra directement.

## Ce qui est couvert

- Agent Mastra `agent-naif-ansu` ;
- prompt/instructions AnSu avec variables prof ;
- scorer custom `ansu-naivety-contract` ;
- mémoire native Mastra via `Memory` avec `thread=sessionId` et `resource=userId` ;
- observability Mastra via `MastraStorageExporter` + LibSQL ;
- Mastra Server/API sur `http://localhost:4111` ;
- Mastra Studio via reverse proxy sur `http://localhost:4112` ;
- dashboard Next AnSu sobre sur `http://localhost:3009` ;
- façade `app/api/agent` qui normalise l’appel Mastra ou mock ;
- mode mock gratuit/offline si aucune clé modèle n'est disponible.

## Lancement local

```bash
cd pocs/runtimes/mastra
cp .env.example .env
npm install
npm run dev
```

URLs :

| Service | URL |
|---|---|
| Mastra Server/API | http://localhost:4111 |
| Mastra Studio + proxy | http://localhost:4112 |
| Dashboard Next AnSu | http://localhost:3009 |
| Agents API | http://localhost:4111/api/agents |
| Traces API | http://localhost:4111/api/observability/traces |
| Scorers API | http://localhost:4111/api/scores/scorers |

## Lancement Docker recommandé

Depuis la racine du benchmark :

```bash
task mastra:up
task mastra:seed
task mastra:logs
task mastra:down
```

Par défaut, `task mastra:seed` utilise le mode `mock` pour rester gratuit et reproductible.

Important : lancer via `task mastra:up` depuis la racine permet de charger le `.env` racine. Un `docker compose` direct peut démarrer le conteneur sans `MISTRAL_API_KEY`.

Pour tester le vrai agent Mastra avec Mistral :

```bash
export MISTRAL_API_KEY=...
export MASTRA_SEED_MODE=mastra
task mastra:up
task mastra:seed
```

## Modes de test

### Mode mock

- Ne nécessite aucune clé API.
- Utilise une réponse déterministe qui respecte le contrat naïf.
- Permet de tester l'UI Next et le scorer AnSu local.
- Ne crée pas de vraie trace LLM Mastra.

### Mode Mastra

- Nécessite `MISTRAL_API_KEY`.
- Appelle `POST /api/agents/agent-naif-ansu/generate` via la façade Next `app/api/agent`.
- N’envoie que le dernier message utilisateur au runtime ; Mastra réinjecte l’historique via `memory.thread/resource`.
- Les runs sont visibles dans Mastra Studio / observability.
- Le scorer `ansu-naivety-contract` est enregistré avec sampling `1` sur l'agent.

## Fichiers importants

| Fichier | Rôle |
|---|---|
| `src/mastra/index.ts` | Configuration Mastra : storage LibSQL, observability, agent, scorer. |
| `src/mastra/agents/naive-agent.ts` | Agent naïf AnSu + configuration `Memory`. |
| `src/mastra/scorers/naivety-contract.ts` | Scorer Mastra custom. |
| `src/lib/ansu-contract.ts` | Contrat métier partagé : prompt, mock, guardrails, score. |
| `app/page.tsx` | Dashboard Next. |
| `app/api/agent/route.ts` | API Next qui appelle Mastra ou le mock. |
| `docker-compose.yml` | Services Mastra runtime + dashboard Next + Studio + gateway Nginx. |

## Premières conclusions à vérifier

- Mastra enregistre correctement agents et scorers sans dépendance `ee/`.
- Studio/API sont utilisables sans auth Mastra native si protégés par reverse proxy/VPN en déploiement.
- Le listing des traces fonctionne via `/api/observability/traces`.
- Le listing des scores dépend du support storage/API courant ; le scorer est bien enregistré via `/api/scores/scorers`.
- La mémoire multi-tour fonctionne en POC avec `thread=sessionId` et `resource=userId`.
- Le dashboard est volontairement minimal : il sert à tester le contrat, pas à devenir l’UI prof finale.
- Pour AnSu, Mastra doit être comparé comme runtime complet, pas comme simple brique observability.

## Licence / gratuité

Le POC utilise le core Mastra publié sous Apache-2.0 hors dossiers `ee/`. Aucune feature `@mastra/core/auth/ee` ou `agent-builder/ee` n'est importée ici.
