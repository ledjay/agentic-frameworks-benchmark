# Mini dashboard Next.js pour Phoenix

Preuve rapide que l'on peut construire une UI métier AnSu au-dessus de Phoenix sans exposer l'UI Phoenix aux profs.

## Principe

```txt
Browser prof -> Next.js dashboard -> appels serveur Phoenix REST -> Phoenix
Team produit -> Phoenix UI native
```

Les appels Phoenix sont faits côté serveur via `lib/phoenix.ts`.

## Lancer

Depuis `phoenix-langchain/dashboard-next` :

```bash
npm install
cp .env.example .env.local
npm run dev
```

Puis ouvrir :

```txt
http://localhost:3007
```

## Ce qui est démontré

- liste des projets Phoenix : `GET /v1/projects`
- liste des traces : `GET /v1/projects/:project/traces`
- détail des spans d'une trace : `GET /v1/projects/:project/spans?trace_id=...`
- lecture annotations : `GET /v1/projects/:project/trace_annotations?trace_ids=...`
- écriture feedback prof : `POST /v1/trace_annotations`

## Limites volontaires

- pas d'auth métier
- pas de pagination UI
- pas de vraie taxonomie d'évaluation prof
- pas de BDD applicative AnSu
- pas de design DSFR : c'est un prototype technique, pas une UI institutionnelle finale

## Extension POC ajoutée

Pages supplémentaires :

- `/prompts` : liste prompts/versions, création d'un prompt chat + version + tag.
- `/criteria` : liste et création de critères d'évaluation via annotation configs.
- `/evals` : création dataset démo, création experiment, mock run et evaluation.

Endpoints Phoenix supplémentaires utilisés :

- `GET /v1/prompts`
- `POST /v1/prompts`
- `GET /v1/prompts/:prompt/versions`
- `POST /v1/prompt_versions/:version/tags`
- `GET /v1/annotation_configs`
- `POST /v1/annotation_configs`
- `GET /v1/datasets`
- `POST /v1/datasets/upload`
- `GET /v1/datasets/:id/examples`
- `GET /v1/datasets/:id/experiments`
- `POST /v1/datasets/:id/experiments`
- `POST /v1/experiments/:id/runs`
- `POST /v1/experiment_evaluations`

Notes importantes :

- Le lancement d'eval est mocké : en production il faut un worker/runner AnSu.
- Phoenix répond `null` sur `POST /v1/datasets/upload` mais crée bien le dataset.
- Le prompt management REST testé impose un template `CHAT`; le template `STR` est refusé.
- La liste `ModelProvider` du prompt management ne contient pas Mistral/Albert, même si le tracing Mistral existe via OpenInference.
