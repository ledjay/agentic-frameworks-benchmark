# Synthèse runtimes agentiques — AnSu v5

> Statut : document de partage et de prise de décision.  
> Objet : comparer **Mastra**, **LangChain** et **LangGraph** comme moteurs possibles pour le POC agentique AnSu.

## 1. Décision à prendre

AnSu doit choisir un runtime agentique capable de faire tourner le POC octobre sans créer de cul-de-sac pour la suite.

Le runtime doit permettre au minimum :

- d’appeler un modèle LLM ;
- de gérer des tools ;
- de tracer les échanges ;
- de brancher des scores / évaluations ;
- d’exposer une API propre vers le produit ;
- de garder une trajectoire maintenable si les workflows deviennent plus complexes.

La décision ne porte pas sur la plateforme d’observability / evals. Ce sujet est traité séparément dans [`SYNTHESE_OBSERVABILITY_EVALS.md`](./SYNTHESE_OBSERVABILITY_EVALS.md).

## 2. Lecture générale

La revue a porté sur trois options :

- Mastra comme runtime agentique TypeScript ;
- LangChain comme framework agentique plus simple ;
- LangGraph comme runtime orienté graphes et workflows non linéaires.

Ce qui ressort de la documentation et des tests : les deux écosystèmes principaux, **Mastra** et **LangChain / LangGraph**, sont capables de répondre aux besoins AnSu sur les points essentiels : tools, API, observability, scores, sorties structurées et intégration avec une plateforme d’évaluation.

La question n’est donc pas :

```txt
Est-ce que l’un peut faire quelque chose que l’autre ne peut pas faire ?
```

Mais plutôt :

```txt
Quel niveau de complexité veut-on assumer dès le POC ?
Quelle stack sera la plus lisible et maintenable pour l’équipe ?
Les workflows AnSu seront-ils plutôt linéaires ou non linéaires ?
```

## 3. Mastra

### Points forts

- Approche agentique moderne.
- Natif TypeScript, donc proche de la stack produit AnSu.
- Code généralement lisible.
- Bonne expérience développeur pour créer des agents, tools, scores et API.
- Bon candidat pour avancer vite sur un POC produit.

### Points faibles

- Écosystème moins mature que LangChain / LangGraph.
- Pour des workflows complexes, l’orchestration peut demander plus de câblage explicite.
- Il faut veiller à ne pas confondre le runtime Mastra avec sa plateforme d’observability associée, qui n’est pas retenue dans le benchmark souverain.

### Lecture

Mastra est une option très crédible si l’objectif principal est de construire vite un POC lisible, en TypeScript, proche du produit.

```txt
Mastra = meilleur candidat si priorité à la lisibilité du code, à TypeScript et à la vitesse de mise en œuvre.
```

## 4. LangChain

### Points forts

- Simple à mettre en œuvre pour des agents ou chaînes relativement linéaires.
- Écosystème très mature.
- Standard du marché.
- Écosystème très mature : nombreux providers de modèles, tools/toolkits, document loaders, vector stores, retrievers et structured outputs documentés.
- Observability très bien couverte côté LangSmith ; pour AnSu, l’intégration avec la plateforme souveraine retenue reste à vérifier selon le runtime choisi.

### Points faibles

- Si l’on choisit la version TypeScript, la documentation et les exemples sont moins fournis que côté Python.
- Moins adapté seul aux workflows complexes et non linéaires.
- Dès que le raisonnement devient un vrai enchaînement d’états, LangGraph devient plus pertinent.

### Lecture

LangChain est très utile pour des cas simples ou moyennement complexes. Pour AnSu, il peut suffire si le POC reste proche d’un flux linéaire : question élève → tool éventuel → réponse → score.

```txt
LangChain = bon choix si le workflow reste simple et si l’équipe veut s’appuyer sur un standard mature.
```

## 5. LangGraph

### Points forts

- Très adapté aux workflows complexes et non linéaires.
- Modèle de graphe explicite : chaque étape peut être nommée, tracée et contrôlée.
- Gestion d’un état interne au run agentique, utile pour accumuler des informations pendant l’exécution et améliorer la réponse finale.
- Standard du marché pour les architectures agentiques plus avancées.
- Très bon candidat si l’agent AnSu doit enchaîner plusieurs étapes : modération, recherche documentaire, raisonnement, vérification, réparation, score, décision finale.

### Points faibles

- Si l’on choisit la version TypeScript, la documentation et les exemples sont moins fournis que côté Python.
- Plus complexe à mettre en œuvre qu’un runtime agentique haut niveau.
- Code moins immédiatement lisible pour une équipe qui découvre le modèle graphe / état.

### Lecture

LangGraph est l’option la plus solide si AnSu anticipe des workflows agentiques non linéaires. Il demande plus d’effort au départ, mais donne un cadre très clair pour contrôler les étapes de l’agent.

```txt
LangGraph = meilleur candidat si priorité aux workflows complexes, au contrôle fin et à l’orchestration explicite.
```

## 6. Comparatif synthétique

| Critère                | Mastra                         | LangChain                          | LangGraph                          |
| ---------------------- | ------------------------------ | ---------------------------------- | ---------------------------------- |
| Stack                  | TypeScript natif               | Python mature, TypeScript possible | Python mature, TypeScript possible |
| Mise en œuvre initiale | Simple et lisible              | Simple pour flux linéaires         | Plus complexe                      |
| Workflows simples      | Très bon                       | Très bon                           | Possible, mais plus lourd          |
| Workflows complexes    | Possible, mais plus de câblage | Moins adapté seul                  | Très bon                           |
| Tools                  | Bon support                    | Très bon support                   | Très bon support                   |
| Scores / evals         | Faisable                       | Faisable                           | Faisable                           |
| Observability          | Faisable via outils externes   | Très bon écosystème                | Très bon écosystème                |
| Lisibilité code        | Très bonne                     | Bonne sur cas simples              | Plus exigeante                     |
| Maturité écosystème    | Plus jeune                     | Très mature                        | Très mature                        |

## 7. Recommandation provisoire

Les trois options restent crédibles, mais elles ne répondent pas au même niveau de complexité.

```txt
Si le POC reste simple et que la priorité est la vitesse produit : Mastra.
Si le besoin reste linéaire et que la priorité est la maturité écosystème : LangChain.
Si l’on veut anticiper des workflows non linéaires et une orchestration plus contrôlée : LangGraph.
```

Pour AnSu, la décision finale dépend surtout d’un point :

```txt
Veut-on démarrer avec le runtime le plus simple à lire maintenant,
ou avec le modèle d’orchestration le plus robuste pour les workflows futurs ?
```

À ce stade, la recommandation est de garder deux options en discussion :

- **Mastra**, si la priorité est un POC TypeScript rapide, lisible et proche du produit ;
- **LangGraph**, si la priorité est de poser dès le départ une orchestration explicite pour des workflows agentiques plus complexes.

LangChain seul reste utile comme brique et comme écosystème, mais semble moins discriminant comme choix de runtime principal si les workflows AnSu deviennent non linéaires.

## 8. Points à vérifier avant décision finale

- Tester ou confirmer la version TypeScript si l’équipe veut éviter un socle Python.
- Vérifier l’intégration avec la plateforme d’observability retenue.
- Vérifier la lisibilité du code pour l’équipe qui maintiendra le POC.
- Vérifier la facilité à exposer une API AnSu stable sans dépendre des objets internes du runtime.
- Vérifier comment le runtime gère les cas futurs : plusieurs tools, réparation, score faible, fallback, reprise d’état.
