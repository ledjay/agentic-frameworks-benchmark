# Langfuse POC pour AnSu

POC observability/evals Langfuse pour AnSu v2.

## Objectif

Tester Langfuse comme brique :

- tracing agentique hiérarchique ;
- SDK TypeScript / OpenTelemetry ;
- scores et evals ;
- prompt management ;
- metadata AnSu, coûts et impacts Albert ;
- compatibilité potentielle avec LangGraph/LangChain TypeScript.

## Lancement

Depuis la racine du repo :

```bash
task langfuse:up
task langfuse:seed
```

URL :

```txt
http://localhost:3012
```

Compte POC initialisé via `.env` :

```txt
admin@ansu.local / ansu-langfuse-admin
```

Clés POC :

```txt
LANGFUSE_PUBLIC_KEY=pk-lf-ansu-poc
LANGFUSE_SECRET_KEY=sk-lf-ansu-poc
LANGFUSE_BASE_URL=http://localhost:3012
```

## Ports locaux

Les ports sont décalés pour éviter les conflits avec les autres POC et les projets locaux :

| Service | Port |
|---|---:|
| Langfuse web | 3012 |
| Langfuse worker | 3032 |
| ClickHouse HTTP | 8124 |
| ClickHouse native | 9001 |
| MinIO S3 | 9010 |
| MinIO console | 9011 |
| Redis | 6380 |
| Postgres | 5433 |
