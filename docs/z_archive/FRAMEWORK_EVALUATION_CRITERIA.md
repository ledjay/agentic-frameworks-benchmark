# Grille d'évaluation des frameworks agentiques AnSu

> **Statut : document historique / banque de critères produit.** La méthode active du benchmark est maintenant dans [`GRILLE_EVALUATION.md`](../benchmark-agentique/GRILLE_EVALUATION.md). Ce fichier conserve des critères métier utiles issus du wiki produit AnSu, mais ne doit plus être utilisé comme grille principale de décision.

Source : benchmark local + lecture du wiki produit AnSu GitLab.

## Lecture produit à garder en tête

AnSu n'évalue pas seulement des frameworks capables de faire discuter un LLM. Le cœur différenciant est la **fabrique d'agents** : fabriquer, régler, versionner, observer et évaluer un agent naïf qui ne redevient jamais expert.

Contrainte de décision : il faut choisir vite une solution **bootstrap** pour octobre, centrée sur **un seul agent**, simple à mettre en œuvre maintenant, mais non bloquante pour construire ensuite les étages suivants : versioning agent, multi-agents, marketplace, evals avancées, socle SecNumCloud.

Les cinq questions du produit deviennent la boussole du benchmark :

1. **Envie** : donne-t-on envie aux enseignants d'essayer une séquence ?
2. **Prise en main** : un enseignant peut-il adapter rapidement, sans écrire de prompt ?
3. **Traces** : les traces aident-elles à repérer incompréhensions et élèves à accompagner ?
4. **Déploiement** : peut-on lancer une séance fiable, modérée, observable et conforme ?
5. **Pertinence pédagogique** : l'agent reste-t-il naïf, relance-t-il, refuse-t-il de résoudre ?

La question 5 est le cœur scientifique et produit.

## Concepts métier non négociables

- **Cas d'usage** : activité pédagogique complète proposée par AnSu.
- **Modèle de séquence** : activité prête à l'emploi, faite par l'équipe AnSu ou la communauté.
- **Séquence** : modèle adapté par un enseignant à une notion/classe.
- **Posture** : règles qui définissent le rôle naïf, ce que l'agent sait, ce qu'il dit, ce qu'il ne doit jamais faire.
- **Garde-fou** : limite à ne jamais franchir.
- **Dérive** : l'agent oublie son rôle et redevient expert.
- **Atelier** : séance lancée pour une vraie classe.
- **Dialogue** : conversation élève-agent.
- **Tour de parole** : aller-retour élève/agent.
- **Trace** : reste exploitable d'un dialogue.
- **Relance** : question pourquoi/comment qui pousse l'élève à préciser.
- **Contrat didactique** : l'élève sait que l'agent fait exprès de ne pas savoir.

## Grille de comparaison

### 0. Bootstrap octobre sans cul-de-sac

Questions à poser :

- Peut-on livrer le POC octobre avec **un seul agent** sans architecture trop lourde ?
- Combien de jours pour obtenir un agent naïf traçable, modéré, évaluable ?
- La solution impose-t-elle dès maintenant des concepts complexes inutiles au POC ?
- Peut-on commencer simple puis ajouter : registry agent, versioning, multi-agents, evals avancées, marketplace ?
- Peut-on remplacer une brique plus tard sans réécrire tout le produit ?
- Les choix de données et d'API évitent-ils le lock-in ?
- L'équipe peut-elle comprendre, débugger et maintenir le POC rapidement ?

Critère de succès : **chemin court vers octobre + trajectoire longue non bloquante**.

Anti-patterns :

- Choisir une plateforme tout-en-un lourde pour un seul agent.
- Choisir un quick win qui enferme prompts, traces, agents et configs dans un SaaS difficile à quitter.
- Surconstruire le multi-agents avant d'avoir prouvé la naïveté d'un agent unique.
- Sous-construire l'observabilité/evals au point de ne pas pouvoir apprendre du POC.

### 1. Agent runtime

Questions à poser :

- Le framework matérialise-t-il un **agent** comme entité de runtime ?
- Peut-on définir tools, modèle, mémoire/dialogue, contexte, règles, guardrails ?
- Peut-on empêcher l'exécution d'un agent non publié/non validé ?
- Peut-on gérer le streaming de réponse sans perdre l'observabilité ?
- Peut-on gérer les replis en cas d'indisponibilité modèle/modération ?

Indicateurs :

- agent configurable en code ou en données ;
- support multi-step / graph / workflow ;
- support streaming ;
- support erreurs/retry/fallback ;
- compatibilité Mistral/Albert/OpenAI-compatible ;
- instrumentation de chaque étape.

### 2. Registry agent / versioning produit

Questions à poser :

- Le framework fournit-il une notion d'agent versionné, ou seulement un runtime ?
- Peut-on figer la version utilisée par un atelier en cours ?
- Peut-on réviser une séquence publiée sans impacter les dialogues en cours ?
- Peut-on historiser posture, garde-fous, modèle, paramètres, corpus, prompt ?
- Peut-on tracer la filiation/fork d'une séquence pour la future marketplace ?

Verdict attendu : même si le framework aide, le registry métier AnSu restera probablement dans notre DB.

### 3. Prompt master + variables profs

Questions à poser :

- Le framework gère-t-il des templates à trous (`{{niveau_scolaire}}`, `{{matiere}}`) ?
- Les variables sont-elles des objets first-class ou seulement des placeholders dans le texte ?
- Le framework sait-il au moins extraire automatiquement la liste des variables présentes dans le template ?
- Peut-on associer un schema métier aux variables : type, label, options, validation, required, pii ?
- Peut-on rendre le prompt côté serveur à partir d'une config prof ?
- Peut-on tracer le template/version sans exposer inutilement les données PII ?

Recommandation AnSu : stocker le schema de variables et les valeurs profs dans la DB AnSu, même si le prompt master est versionné dans un outil externe. L'extraction automatique de variables est utile pour contrôle/cohérence, mais ne remplace pas le schema métier.

### 4. Posture et naïveté

Questions à poser :

- Peut-on composer explicitement les quatre blocs de posture : rôle, contexte, consignes, interdits ?
- Peut-on valider la présence d'interdits obligatoires avant publication ?
- Peut-on imposer une politique anti-acquiescement ?
- Peut-on refuser les garde-fous génériques/passe-partout au profit d'interdits ciblés ?
- Peut-on garantir une honnêteté épistémique : corpus ou aveu d'incertitude ?
- Peut-on maintenir la posture sur un échange long ?

Critère de succès : le framework ne doit pas seulement répondre ; il doit aider à maintenir un contrat didactique stable.

### 5. Calibration et anti-dérive

Questions à poser :

- Peut-on calibrer le niveau d'ignorance de l'agent ?
- Peut-on détecter automatiquement une dérive vers l'expertise ?
- Peut-on corriger/régénérer une réponse avant qu'elle atteigne l'élève ?
- Peut-on suspendre le dialogue si la dérive n'est pas corrigeable ?
- Peut-on journaliser dérives et corrections ?
- Peut-on rejouer des dialogues de référence lors d'un changement de modèle ?

Indicateurs : guardrail output, evaluator de naïveté, boucle critique-réécriture, traces de correction, dataset de non-régression.

### 6. Modération et sécurité

Questions à poser :

- Modération input avant modèle ?
- Modération output avant affichage élève ?
- Mode sûr par défaut si modération indisponible ?
- Journalisation des incidents ?
- Alertes enseignant en cas d'incident ?
- Réglage de sévérité sans écrire de règles techniques ?

Critère de succès : la modération doit être intégrée au runtime et aux traces, pas ajoutée comme un simple filtre invisible.

### 7. Traces pédagogiques et insight

Questions à poser :

- Le framework permet-il de tracer les tours de parole et décisions internes ?
- Peut-on relire un dialogue tour par tour ?
- Peut-on produire une synthèse pédagogique ?
- Peut-on classifier les messages élève : demande de réponse, raisonnement, reformulation, blocage ?
- Peut-on repérer les incompréhensions récurrentes à l'échelle classe ?
- Peut-on distinguer traces d'essai enseignant vs traces élève ?

Critère de succès : les traces doivent être exploitables par un dashboard prof, pas seulement par une console développeur.

### 8. Evals et non-régression

Questions à poser :

- Peut-on définir des critères d'évaluation métiers ?
- Peut-on mixer evals code, LLM-as-judge et feedback prof ?
- Peut-on constituer des datasets depuis traces réelles ?
- Peut-on rejouer un agent/prompt/model sur un dataset de référence ?
- Peut-on bloquer une publication si les garde-fous ou la naïveté régressent ?
- Peut-on comparer deux versions d'agent/séquence/prompt ?
- Peut-on produire des mesures d'impact fiables et comparables dans le temps ?

Critère de succès : supporter Q5, pas seulement des métriques générales de qualité.

### 9. Recherche et preuve d'impact

Questions à poser :

- Le framework permet-il d'exploiter les traces comme **instrument de recherche** ?
- Peut-on exporter des traces/dialogues/evals sous forme anonymisée pour des chercheurs partenaires ?
- Peut-on séparer données opérationnelles, données pédagogiques et données de recherche ?
- Peut-on documenter précisément les versions d'agent, prompt, modèle, corpus et garde-fous utilisés dans une étude ?
- Peut-on constituer des cohortes ou jeux de données comparables entre ateliers, classes, notions ou versions ?
- Peut-on mesurer l'évolution d'un élève ou d'une classe : reformulation, précision, demandes de réponse, blocages, relances utiles ?
- Peut-on produire des indicateurs agrégés : incompréhensions récurrentes, taux de dérive, taux de correction, progression des explications ?
- Peut-on rejouer des analyses avec les mêmes paramètres pour garantir la reproductibilité ?
- Peut-on tracer le consentement, les conditions d'usage, l'anonymisation et les droits d'accès aux jeux de données de recherche ?
- Peut-on exposer des exports ou APIs stables aux chercheurs sans leur donner accès aux données identifiantes ?

Critère de succès : la solution doit aider AnSu à **évaluer et prouver son impact pédagogique**, pas seulement à faire fonctionner un agent.

### 10. Observabilité technique

Questions à poser :

- OpenTelemetry natif ou intégrable proprement ?
- Spans typés : agent, LLM, tool, retriever, guardrail, evaluator ?
- Export vers Phoenix et Grafana/Tempo via collector ?
- Métriques : latence, erreurs, tokens, coûts, taux de dérive, taux de correction, santé modération/modèle ?
- Rétention et purge configurables ?

Critère de succès : pouvoir construire une vue produit + une vue ops depuis les mêmes événements.

### 11. Déploiement classe et robustesse

Questions à poser :

- Ateliers/séances longues avec plusieurs élèves ?
- Quotas par atelier/classe ?
- Budget de latence par tour de parole ?
- Reprise de dialogue interrompu ?
- Suspension/reprise d'atelier ?
- Comportement lisible en cas d'indisponibilité modèle/modération/analyse ?

Critère de succès : ne pas confondre POC single-call et séance réelle en classe.

### 12. Conformité, mineurs, données

Questions à poser :

- Minimisation des données envoyées au modèle ?
- PII masking ou redaction avant traces ?
- Rétention/purge ?
- Accès restreint par rôle, classe, enseignant ?
- Export anonymisé recherche ?
- Journalisation des accès et traitements ?
- Localisation/sous-traitance compatible Éducation nationale ?

Critère de succès : un framework qui rend difficile l'anonymisation ou l'isolation des traces est risqué.

### 13. SecNumCloud / socle compatible

Questions à poser :

- Le framework est-il **self-hostable** sans dépendance obligatoire à un SaaS externe ?
- Peut-il être déployé sur un socle compatible avec les contraintes Éducation nationale / beta.gouv / DINUM ?
- Existe-t-il une offre hébergée SecNumCloud ou compatible SecNumCloud ?
- Si l'offre principale est SaaS, quelles données sortent du SI : prompts, traces, evals, datasets, logs, métriques ?
- Peut-on désactiver toute télémétrie éditeur ?
- Les composants nécessaires sont-ils disponibles en conteneurs standards Docker/Kubernetes ?
- Le stockage peut-il utiliser PostgreSQL, S3 compatible, Redis, OTel Collector, etc. fournis par le socle ?
- La solution accepte-t-elle Mistral/Albert/API interne sans forcer OpenAI/Anthropic cloud ?
- Les secrets peuvent-ils rester dans le gestionnaire de secrets du socle plutôt que dans l'outil ?
- La licence autorise-t-elle l'exploitation institutionnelle et la redistribution éventuelle ?
- Le mode dégradé reste-t-il sûr si une dépendance externe est indisponible ?

Critère de succès : une brique critique doit pouvoir tourner sur le socle choisi, avec données maîtrisées, télémétrie désactivable, et sans dépendance bloquante à un SaaS non conforme.

### 14. API pour dashboard Next

Questions à poser :

- Peut-on tout piloter via API serveur : prompts, versions, configs, traces, evals, annotations ?
- REST/GraphQL documentés ?
- Pagination/filtres suffisants ?
- Client TypeScript viable ou OpenAPI exploitable ?
- Peut-on garder l'UI framework réservée à la team produit et construire une UI prof dédiée ?

Critère de succès : le framework doit être une brique backend/ops, pas imposer son UI aux enseignants.

### 15. Marketplace future

Questions à poser :

- Portabilité/anonymisation d'une posture partagée ?
- Versioning/fork/filiation de séquences ?
- Compatibilité d'une séquence avec la version courante de la fabrique ?
- Métadonnées : discipline, niveau, notion, licence, auteur, qualité ?
- Circuit de curation/modération avant publication ?

Critère de succès : ne pas choisir une brique qui bloque la réutilisation/fork/versioning des séquences.

## Pondération proposée pour le benchmark d'ici octobre

Priorité haute :

1. Bootstrap octobre sans cul-de-sac.
2. Posture et naïveté / anti-dérive.
3. Modération input/output et comportement sûr.
4. Observabilité OpenTelemetry + traces pédagogiques.
5. Evals et non-régression.
6. Recherche et preuve d'impact.
7. API exploitable depuis Next.
8. Prompt master + variables profs.
9. Compatibilité socle / SecNumCloud / self-host.

Priorité moyenne :

10. Registry agent/versioning produit.
11. Robustesse séance/classe.
12. Conformité, PII, rétention.

À garder pour plus tard mais ne pas bloquer :

13. Marketplace, réputation, fork, curation avancée.

## Conséquence pour les frameworks

- **Phoenix** : bon candidat observabilité/evals/prompt management partiel ; pas un runtime/registry agent complet.
- **Mastra / LangChain / LangGraph** : à évaluer comme runtime agentique ; vérifier s'ils aident vraiment sur posture, guardrails, versioning, evals et OTel.
- **AnSu backend** : devra probablement porter les agrégats métier : cas d'usage, modèle de séquence, séquence, posture, agent naïf, atelier, dialogue, variable schema, config prof.
