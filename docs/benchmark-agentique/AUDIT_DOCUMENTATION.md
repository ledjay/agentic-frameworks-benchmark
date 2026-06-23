# Audit de la documentation — benchmark agentique AnSu v2

> **Statut : document de travail.** Objectif : évaluer la structure actuelle des Markdown du repo et proposer une organisation plus lisible, progressive et à jour avant la suite du benchmark observability/evals.

## 1. Objectif de l’audit

La documentation doit permettre une lecture simple et rapide par plusieurs publics :

- **Mathieu / produit / pédagogie** : comprendre les décisions, les risques et ce que chaque brique apporte à AnSu.
- **Thomas / tech / ops** : comprendre l’architecture, les contraintes de déploiement, les données, les traces et l’intégration.
- **Nous pendant le benchmark** : retrouver rapidement les preuves, les questions, les statuts et les conclusions.

Principe cible :

```txt
Synthèse courte → questions de décision → fiches détaillées → preuves POC.
```

Les détails doivent apparaître progressivement :

```txt
README = orientation rapide
Synthèses = décisions et shortlist
Questions = grille de pilotage
Fiches = preuves détaillées par outil/brique
README POC = comment lancer et vérifier localement
Archives / banque = critères historiques, non décisionnels
```

## 2. Inventaire actuel

| Fichier | Rôle actuel | État | Diagnostic court |
|---|---|---|---|
| `README.md` | Porte d’entrée repo | Partiellement obsolète | Très utile, mais encore centré Phoenix/MLflow/Mastra et mentionne runtime custom/Vercel AI SDK comme candidat actif. Doit devenir un index court. |
| `docs/benchmark-agentique/GRILLE_EVALUATION.md` | Méthode active de benchmark | Partiellement à jour | Bonne base méthodo, mais contient encore Runtime AnSu minimal TS dans les scénarios actifs. Trop long pour lecture rapide. |
| `docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md` | Banque historique critères produit | À sa place si marqué archive | Statut historique déjà explicite. À garder, mais sortir de la lecture principale. |
| `docs/benchmark-agentique/QUESTIONS_STRUCTURANTES.md` | Tableau de pilotage des questions | Partiellement obsolète | Très utile, mais mélange états anciens et nouveaux. Numérotation désordonnée (`12` avant `11`). Références à `SCENARIOS.md` inexistant et runtime custom encore actif. |
| `docs/benchmark-agentique/SYNTHESE_RUNTIME.md` | Synthèse runtime | Globalement à jour | Bon document de décision runtime. Quelques formulations anciennes restent : “contrôle fin”, “graph-native”, coûts Albert peut-être trop affirmés. Structure perfectible : la décision shortlist arrive tard. |
| `docs/benchmark-agentique/TRACES_PRIORITAIRES.md` | Référentiel traces pour obs/evals | À jour / en cours | Très utile pour la phase suivante. Bon équilibre tech/non-tech après échanges. À relier fortement aux questions B. |
| `docs/benchmark-agentique/fiches/runtime-mastra.md` | Fiche détaillée Mastra runtime | Trop courte / stale | Fiche moins à jour que la synthèse. Elle ne contient pas toutes les validations A1-A13 réalisées. |
| `docs/benchmark-agentique/fiches/runtime-langgraph-python.md` | Fiche détaillée LangGraph | Partiellement à jour | Bon contenu mais probablement incomplet : la synthèse dit A1-A13 validés, la fiche est courte et mentionne encore Mistral “à tester” sur A3 alors que Mistral tools a été validé. |
| `docs/z_archive/PHOENIX_CONCLUSIONS.md` | Conclusion Phoenix historique | Archivé | Très riche, mais antérieur au nouveau cadrage traces. À réintégrer plus tard dans une fiche active `docs/benchmark-agentique/fiches/observability-phoenix.md` si nécessaire. |
| `docs/z_archive/MLFLOW_CONCLUSIONS.md` | Conclusion MLflow historique | Archivé | Très riche, mais antérieur au nouveau cadrage traces. À réintégrer plus tard dans une fiche active `docs/benchmark-agentique/fiches/observability-mlflow.md` si nécessaire. |
| `pocs/observability/phoenix/EVALUATION.md` | Évaluation POC Phoenix courte | Redondant | Résumé utile mais recoupe `PHOENIX_CONCLUSIONS.md`. Devrait devenir preuve POC ou être absorbé par la fiche Phoenix. |
| `pocs/observability/mlflow/EVALUATION.md` | Évaluation POC MLflow courte | Redondant | Même rôle que ci-dessus côté MLflow. |
| `pocs/observability/phoenix/README.md` | README POC Phoenix | Bon emplacement | Doit rester opérationnel : comment lancer, ce que ça démontre, limites. |
| `pocs/observability/mlflow/README.md` | README POC MLflow | Bon emplacement | Doit rester opérationnel. |
| `pocs/runtimes/mastra/README.md` | README POC Mastra | Bon emplacement | Utile. À vérifier avec état actuel : Mastra et Albert validés ? Observability séparée ? |
| `pocs/observability/phoenix/dashboard-next/README.md` | README mini dashboard | Bon emplacement | Preuve d’intégration UI. Peut rester POC-local. |

## 3. Problèmes structurels principaux

### 3.1 Trop de documents racine décisionnels

Aujourd’hui, plusieurs docs de décision sont au root :

```txt
README.md
docs/benchmark-agentique/GRILLE_EVALUATION.md
docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md
docs/z_archive/PHOENIX_CONCLUSIONS.md
docs/z_archive/MLFLOW_CONCLUSIONS.md
```

Problème : un lecteur ne sait pas immédiatement quoi lire en premier ni quels documents sont actifs.

Recommandation : le root doit rester minimal :

```txt
README.md = entrée rapide
docs/benchmark-agentique/GRILLE_EVALUATION.md = méthode, si on veut la garder au root
docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md = archive/banque historique clairement signalée
```

Les conclusions par outil devraient aller dans :

```txt
docs/benchmark-agentique/fiches/
```

### 3.2 La décision runtime est à jour, mais pas propagée partout

Décisions récentes :

```txt
Runtime custom reporté hors benchmark.
Shortlist runtime = Mastra + LangGraph/LangChain Python.
LangGraph = orchestration explicite par graphe d’état, pas “plus puissant” ni “bas niveau”.
Observability/evals = phase suivante.
```

Documents qui doivent être réalignés :

- `README.md`
- `docs/benchmark-agentique/GRILLE_EVALUATION.md`
- `QUESTIONS_STRUCTURANTES.md`
- fiches runtime

### 3.3 Les fiches détaillées ne reflètent pas toujours la synthèse

La synthèse runtime dit que Mastra et LangGraph ont validé A1-A13, mais :

- `runtime-mastra.md` est encore très condensé ;
- `runtime-langgraph-python.md` contient des lignes potentiellement obsolètes, notamment Mistral “à tester” alors que certains tests tools Mistral ont été validés ;
- les détails des erreurs/fixes importantes sont surtout dans la conversation et la synthèse, pas toujours dans les fiches.

Recommandation : les fiches doivent être les preuves détaillées, la synthèse doit rester courte.

### 3.4 Les docs Phoenix/MLflow sont riches mais pas intégrées au nouveau process

Phoenix et MLflow ont été testés avant le cadrage `TRACES_PRIORITAIRES.md`. Les conclusions sont utiles mais devraient être relues avec la nouvelle grille :

```txt
BDD produit vs BDD evals/ops
scorers en temps réel
frontière obs/evals vs dashboard produit/prof
export et corrélation IDs
coût/impact provider
```

Recommandation : créer des fiches observability standardisées et y rapatrier les conclusions utiles.

### 3.5 Progressivité insuffisante

Certains documents longs mélangent :

- décision courte ;
- protocole ;
- preuves POC ;
- réflexions futures ;
- commandes locales.

Cible :

```txt
1. Décision / TL;DR
2. Pourquoi c’est important
3. Ce qui est validé
4. Ce qui reste ouvert
5. Preuves / liens
6. Détails techniques si nécessaire
```

## 4. Structure documentaire cible proposée

```txt
README.md
docs/benchmark-agentique/GRILLE_EVALUATION.md
docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md        # archive / banque historique

docs/benchmark-agentique/
├── INDEX.md                            # optionnel : ordre de lecture détaillé
├── QUESTIONS_STRUCTURANTES.md          # pilotage des questions A/B/C/D/T/S/F
├── TRACES_PRIORITAIRES.md              # référentiel traces pour obs/evals
├── SYNTHESE_RUNTIME.md                 # décision runtime Mastra + LangGraph shortlist
├── SYNTHESE_OBSERVABILITY.md           # à créer après bench obs/evals
├── SCENARIOS.md                        # à créer quand on compose runtime + obs + BDD + front
└── fiches/
    ├── runtime-mastra.md
    ├── runtime-langgraph-python.md
    ├── observability-phoenix.md
    ├── observability-mlflow.md
    ├── observability-langfuse.md       # à créer si testé
    ├── observability-langsmith.md      # à créer si testé
    ├── observability-mastra.md         # à créer si testé
    └── evals-promptfoo.md              # à créer si testé

pocs/observability/phoenix/README.md             # README POC local uniquement
pocs/observability/phoenix/EVALUATION.md         # à absorber ou marquer “preuve POC”
pocs/observability/mlflow/README.md                  # README POC local uniquement
pocs/observability/mlflow/EVALUATION.md              # à absorber ou marquer “preuve POC”
pocs/runtimes/mastra/README.md                # README POC local uniquement
```

## 5. Ordre de lecture recommandé

### Lecture rapide Mathieu / Thomas

1. `README.md` — où en est le benchmark, quoi lire.
2. `docs/benchmark-agentique/SYNTHESE_RUNTIME.md` — shortlist runtime.
3. `docs/benchmark-agentique/TRACES_PRIORITAIRES.md` — ce qu’on doit tracer et pourquoi.
4. `docs/benchmark-agentique/SYNTHESE_OBSERVABILITY.md` — à créer après bench obs/evals.

### Lecture tech détaillée

1. `docs/benchmark-agentique/GRILLE_EVALUATION.md` — méthode.
2. `QUESTIONS_STRUCTURANTES.md` — questions actives et statuts.
3. `docs/benchmark-agentique/fiches/*.md` — preuves par outil.
4. READMEs POC (`pocs/runtimes/mastra/`, `pocs/observability/phoenix/`, `pocs/observability/mlflow/`) — lancement local.

### Archive / contexte produit

- `docs/z_archive/FRAMEWORK_EVALUATION_CRITERIA.md` — banque historique, non décisionnelle.

## 6. Règles de style recommandées

### 6.1 En haut de chaque doc

Chaque document devrait commencer par :

```md
> Statut : actif / brouillon / archive / preuve POC
> Public : produit + tech / tech uniquement / preuve locale
> À lire après : ...
```

### 6.2 Double lecture tech / non-tech

Format recommandé :

```txt
Phrase claire en langage produit.
Puis détails techniques en liste ou tableau.
```

Exemple :

```md
Mastra reste en shortlist car il permet de livrer vite dans une stack TypeScript.
Techniquement, il valide mémoire, scorers, structured output, tools et Docker.
```

### 6.3 Progressivité

Éviter de mettre les preuves détaillées dans les synthèses. Préférer :

```txt
Synthèse = décision + risques + liens.
Fiche = preuves + captures + commandes + limites.
README POC = lancer localement.
```

### 6.4 Vocabulaire à harmoniser

Préférer :

```txt
orchestration explicite par graphe d’état
```

plutôt que :

```txt
contrôle bas niveau
plus puissant
graph-native seul sans explication
```

Préférer :

```txt
Base métier / BDD produit
BDD evals & ops
copie obs
outil obs/evals
```

et éviter :

```txt
source de vérité obs
redaction/RBAC dans les docs produit
```

## 7. Actions concrètes recommandées

### Priorité 1 — mettre à jour la lecture rapide

1. Réécrire `README.md` pour refléter l’état actuel :
   - shortlist runtime = Mastra + LangGraph ;
   - runtime custom reporté ;
   - phase suivante = observability/evals ;
   - `TRACES_PRIORITAIRES.md` devient doc clé ;
   - Phoenix/MLflow sont POC obs historiques à réévaluer avec la nouvelle grille.

2. Corriger `QUESTIONS_STRUCTURANTES.md` :
   - supprimer/runtime custom des candidats actifs ;
   - remplacer `SCENARIOS.md à créer` par une formulation “à créer après obs/evals” ;
   - renuméroter `## 11` / `## 12` ;
   - marquer A1-A13 comme validés globalement ou renvoyer à `SYNTHESE_RUNTIME.md` ;
   - aligner B11 avec la frontière obs/evals déjà tranchée.

3. Mettre à jour `docs/benchmark-agentique/GRILLE_EVALUATION.md` :
   - runtime custom n’est plus un scénario de benchmark actif ;
   - ajouter LangSmith explicitement dans B ;
   - ajouter `TRACES_PRIORITAIRES.md` comme checklist de catégorie B ;
   - préciser que les scénarios viendront après obs/evals.

### Priorité 2 — stabiliser les fiches runtime

4. Reprendre `runtime-mastra.md` pour qu’elle contienne vraiment A1-A13 avec preuves, pas seulement une fiche courte.
5. Reprendre `runtime-langgraph-python.md` pour corriger les points obsolètes et refléter A1-A13 validés.
6. Dans `SYNTHESE_RUNTIME.md`, déplacer la décision shortlist plus haut ou ajouter un encadré “Décision actuelle” en tout début.

### Priorité 3 — intégrer Phoenix / MLflow dans la nouvelle structure

7. Déplacer ou dupliquer les conclusions :
   - `docs/z_archive/PHOENIX_CONCLUSIONS.md` → `docs/benchmark-agentique/fiches/observability-phoenix.md`
   - `docs/z_archive/MLFLOW_CONCLUSIONS.md` → `docs/benchmark-agentique/fiches/observability-mlflow.md`

8. Garder `pocs/observability/phoenix/EVALUATION.md` et `pocs/observability/mlflow/EVALUATION.md` comme preuves POC locales, ou les remplacer par un lien depuis les fiches observability.

9. Relire Phoenix/MLflow avec `TRACES_PRIORITAIRES.md` :
   - scores en temps réel ;
   - corrélation BDD produit / BDD evals & ops ;
   - export API ;
   - coût/impact provider ;
   - frontière obs ≠ dashboard produit/prof.

### Priorité 4 — préparer la suite

10. Créer `SYNTHESE_OBSERVABILITY.md` quand Langfuse/LangSmith/Mastra Obs/Phoenix/MLflow/Promptfoo auront été challengés avec la même grille.
11. Créer `SCENARIOS.md` seulement après cette étape, pour composer :
    - runtime ;
    - BDD produit ;
    - BDD evals & ops ;
    - front ;
    - provider ;
    - outil obs/evals.

## 8. Verdict global

La documentation contient beaucoup de bonnes preuves, mais elle reflète plusieurs vagues successives du benchmark. Le risque principal aujourd’hui n’est pas le manque d’information, mais la difficulté à savoir :

```txt
quoi lire en premier,
ce qui est encore actif,
ce qui est historique,
et où trouver les preuves.
```

La réorganisation doit donc viser :

```txt
moins de documents au root,
une synthèse courte par grande décision,
des fiches détaillées par outil,
et des README POC strictement opérationnels.
```

Priorité immédiate avant le bench observability/evals :

```txt
mettre à jour README + QUESTIONS_STRUCTURANTES + GRILLE_EVALUATION
pour refléter l’état actuel et faire de TRACES_PRIORITAIRES.md la checklist officielle de la catégorie B.
```
