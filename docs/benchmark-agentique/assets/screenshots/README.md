# Screenshots benchmark AnSu

Ce dossier contient les captures utilisées comme preuves visuelles dans les fiches d’évaluation.

## Règles

- Ne jamais capturer de donnée élève réelle.
- Ne jamais capturer de clé API, secret, token ou cookie.
- Utiliser des sessions synthétiques : `preview-*`, `benchmark-*`, `eval-*`.
- Une capture illustre une preuve ; elle ne remplace pas le `traceId`, l’URL, l’export ou le test local.

## Convention de nommage

```txt
YYYY-MM-DD__<question-id>__<outil>__<vue>__<combo>.png
```

Exemples :

```txt
2026-06-23__B3__langfuse__trace-tree__mastra-mistral.png
2026-06-23__B10__mlflow__prompt-registry__runtime-ref.png
2026-06-23__B13__phoenix__trace-ui__langgraph-python-mistral.png
```

## Intégration Markdown

```md
![B3 — Trace Langfuse lisible](./assets/screenshots/2026-06-23__B3__langfuse__trace-tree__mastra-mistral.png)
```
