# Exploration des runtimes agentiques — AnSu

> Statut : carnet de bord d'exploration.  
> Objectif : comprendre les paradigmes, la tuyauterie et le coût de montée en complexité avant de trancher le runtime du POC AnSu.

## 1. Objectif

Pendant 3 jours et demi, on explore les runtimes agentiques en mode pratique : Jérémie code, Ben guide / relit / aide à tester.

Questions principales :

- comment chaque runtime pense un agent ?
- où vivent les messages, l'état, les tools, les scores et les traces ?
- comment passe-t-on d'un flux linéaire à du routing, puis à des boucles de vérification / réparation ?
- quelle plomberie doit être réécrite quand le besoin se complexifie ?
- peut-on garder une API AnSu stable, indépendante du runtime choisi ?

## 2. Runtimes explorés

| Runtime | Rôle dans l'exploration |
|---|---|
| **Mastra** | Framework TypeScript produit : agents, tools, workflows, memory, scorers, guardrails, observability. |
| **LangGraph TypeScript** | Graphe d'état explicite dans la stack TypeScript. |
| **LangGraph Python** | Référence mature LangGraph / LangChain, déjà poussée dans le benchmark. |
| **Vercel AI SDK** | Primitives TypeScript explicites : modèle, tools, structured output, routing écrit en code. |

DeepAgents est gardé pour plus tard : utile comme horizon avancé, mais hors scope de cette phase.

## 3. Contrat minimal AnSu

Le produit AnSu ne doit pas dépendre des objets internes du runtime. On raisonne donc avec un contrat minimal stable :

```ts
type AgentTurnRequest = {
  sessionId: string
  userId: string
  message: string
}

type AgentTurnResponse = {
  sessionId: string
  answer: string
  traceId?: string
  scores?: {
    ansuNaivety?: number
  }
  toolCalls?: Array<{
    name: string
    status: 'success' | 'error'
  }>
}
```

Le contrat peut évoluer, mais le principe reste :

```txt
Front / playground → API AnSu stable → adapter runtime → Mastra / LangGraph / AI SDK
```

## 4. Mini-POCs progressifs

Chaque runtime est observé à travers les mêmes cas de figure.

| POC | Flux testé | Question |
|---|---|---|
| 1. Linéaire | message → réponse → score/trace | Le bootstrap est-il simple et lisible ? |
| 2. Tool call | message → tool éventuel → réponse | Les tools sont-ils naturels, typés et traçables ? |
| 3. Routing | classify → branche tool/direct | Le routing est-il explicite et maintenable ? |
| 4. Check / repair | generate → check → repair si besoin | Les boucles de correction restent-elles propres ? |
| 5. Mémoire | session multi-tour isolée | Le modèle session/user est-il maîtrisable ? |
| 6. Structured output | réponse + objet métier | Le runtime aide-t-il à produire du structuré fiable ? |

## 5. Axes de lecture à chaud

Pour chaque POC, noter court :

- ce qui est naturel ;
- ce qui est pénible ;
- ce qui est implicite / magique ;
- ce qui reste portable derrière le contrat AnSu ;
- ce qui serait à réécrire si on change de runtime ;
- ce que ça implique pour le POC octobre.

## 6. Notes — Mastra

À compléter pendant l'exploration.

## 7. Notes — LangGraph TypeScript

À compléter pendant l'exploration.

## 8. Notes — LangGraph Python

À compléter pendant l'exploration.

## 9. Notes — Vercel AI SDK

À compléter pendant l'exploration.

## 10. Synthèse intermédiaire

À compléter après les premiers POCs.
