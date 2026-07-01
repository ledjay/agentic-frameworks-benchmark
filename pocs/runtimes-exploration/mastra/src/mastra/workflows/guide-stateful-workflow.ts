import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

// POC A5 — variante stateful du workflow minimal pour tester la non-linéarité.
//
// Objectif : vérifier si Mastra permet d'écrire un petit flux à branches
// conditionnelles de façon lisible, comparable à ce qu'on fera demain avec
// LangGraph.
//
// Le scénario reste simple :
// 1. on classe la demande élève ;
// 2. on choisit une branche selon la route ;
// 3. on construit un contexte commun ;
// 4. on fait un seul appel LLM final pour produire la réponse.
//
// Important : ce POC ne teste pas le retrieval réel. Le tool `searchKnowledge`
// est déjà testé séparément dans A3. Ici, on isole surtout la lisibilité du
// routing / branching.
//
// --- Version stateful ---
//
// Cette version utilise le `workflow state` de Mastra pour partager `route`
// et `knowledgeSnippet` entre les steps, sans avoir à les faire transiter
// dans les inputSchema/outputSchema ni à lire manuellement la sortie de
// `.branch()` (l'ancienne plomberie `inputData["prepare-hint-context"] ?? ...`).

const guideRouteSchema = z.enum(["hint", "direct", "off_topic"]);

// Entrée publique du workflow : un message élève brut.
const guideInputSchema = z.object({
  message: z.string().describe("The student message to route"),
});

// État partagé du workflow.
//
// `route` est écrit par `classify-request` puis lu par `generate-answer`
// et par les conditions de `.branch()`. `knowledgeSnippet` n'est écrit que
// par la branche `hint`. Les deux champs sont optionnels : aucun
// `initialState` n'est requis, et les steps ne les remplissent que
// progressivement.
const guideStateSchema = z.object({
  route: guideRouteSchema.optional(),
  knowledgeSnippet: z.string().optional(),
});

// Sortie technique des steps intermédiaires.
// Elle reste volontairement minimale : le message transite entre les steps,
// tandis que la route et l'indice passent par le workflow state.
const guideStepOutputSchema = guideInputSchema;

// Sortie finale du workflow : la route empruntée et la réponse utilisateur.
const guideOutputSchema = z.object({
  route: guideRouteSchema,
  answer: z.string(),
});

// Classifieur déterministe pour que le POC reste stable.
//
// On ne teste pas ici la qualité d'un classifieur LLM : on teste la capacité du
// runtime à router proprement selon une décision déjà prise.
function classifyRequest(message: string): z.infer<typeof guideRouteSchema> {
  const text = message.toLowerCase();

  if (text.includes("indice") || text.includes("aide")) {
    return "hint";
  }

  if (text.includes("réponse") || text.includes("reponse") || text.includes("directement")) {
    return "direct";
  }

  return "off_topic";
}

// Étape 1 : classer la demande et écrire la route dans le state.
//
// Entrée/sortie simples : `{ message }` passe à travers. La route est stockée
// dans `state.route` via `setState`, ce qui évite de la propager manuellement
// dans tous les outputSchema suivants.
const classifyRequestStep = createStep({
  id: "classify-request",
  description: "Classify the student request into a simple guide route",
  inputSchema: guideInputSchema,
  outputSchema: guideStepOutputSchema,
  stateSchema: z.object({ route: guideRouteSchema.optional() }),
  execute: async ({ inputData, state, setState }) => {
    const route = classifyRequest(inputData.message);
    await setState({ ...state, route });
    return {
      message: inputData.message,
    };
  },
});

// Branche "hint" : prépare un contexte avec un indice.
//
// Dans un vrai produit, cette branche appellerait le retrieval/RAG ou un tool
// documentaire. Pour ce POC A5, l'indice est volontairement mocké : A3 valide
// déjà que Mastra sait brancher et tracer un tool.
//
// L'indice est écrit dans `state.knowledgeSnippet` plutôt que dans la sortie
// du step : `generate-answer` le lira directement depuis le state.
const prepareHintContextStep = createStep({
  id: "prepare-hint-context",
  description: "Prepare context for a hint request using the knowledge tool",
  inputSchema: guideStepOutputSchema,
  outputSchema: guideStepOutputSchema,
  stateSchema: z.object({ knowledgeSnippet: z.string().optional() }),
  execute: async ({ inputData, state, setState }) => {
    const knowledgeSnippet =
      "Observe ce qui entre dans la plante : eau, lumière, air. La terre sert-elle plutôt de nourriture ou de support ?";

    await setState({
      ...state,
      knowledgeSnippet,
    });

    return {
      message: inputData.message,
    };
  },
});

// Branche "direct" : pas de retrieval, on passe le message à travers.
//
// Le LLM final recevra `route = direct` (lu dans le state) et devra refuser
// de donner directement la réponse, tout en posant une question pédagogique.
const prepareDirectContextStep = createStep({
  id: "prepare-direct-context",
  description: "Prepare context for a direct-answer request",
  inputSchema: guideStepOutputSchema,
  outputSchema: guideStepOutputSchema,
  execute: async ({ inputData }) => {
    return {
      message: inputData.message,
    };
  },
});

// Branche "off_topic" : pas de retrieval, on passe le message à travers.
//
// Le LLM final recevra `route = off_topic` (lu dans le state) et devra
// ramener l'élève vers l'activité au lieu de répondre à la demande hors
// sujet.
const prepareOffTopicContextStep = createStep({
  id: "prepare-off-topic-context",
  description: "Prepare context for an off-topic request",
  inputSchema: guideStepOutputSchema,
  outputSchema: guideStepOutputSchema,
  execute: async ({ inputData }) => {
    return {
      message: inputData.message,
    };
  },
});

// Étape finale : produit la réponse à partir du state partagé.
//
// Contrairement à la version précédente, on ne lit plus la sortie de
// `.branch()` (l'objet indexé par step id). On lit directement `state.route`
// et `state.knowledgeSnippet`. L'`inputData` ne contient plus que le message,
// rendu possible par le `.map()` qui aplatit la sortie de branche.
const generateAnswerStep = createStep({
  id: "generate-answer",
  description: "Generate the final pedagogical answer for the selected route",
  inputSchema: guideStepOutputSchema,
  outputSchema: guideOutputSchema,
  stateSchema: guideStateSchema,
  execute: async ({ inputData, state, mastra }) => {
    const route = state.route;

    if (!route) {
      throw new Error("Route not set in workflow state");
    }

    const agent = mastra?.getAgent("guideAnswerAgent");

    if (!agent) {
      throw new Error("guideAnswerAgent not found");
    }

    const prompt = `Tu es un assistant pédagogique AnSu.

Route choisie : ${route}
Message élève : ${inputData.message}
Indice disponible : ${state.knowledgeSnippet ?? "aucun"}

Règles :
- si route = hint, utilise l'indice sans donner directement la réponse ;
- si route = direct, refuse gentiment de donner la réponse directe et pose une question ;
- si route = off_topic, recentre l'élève sur l'activité ;
- réponds en français, en 3 phrases maximum.`;

    const response = await agent.generate(prompt);

    return {
      route,
      answer: response.text,
    };
  },
});

// Workflow complet.
//
// Lecture rapide du graphe :
//
// classify-request          (écrit state.route)
//   ├─ hint      → prepare-hint-context      (écrit state.knowledgeSnippet)
//   ├─ direct    → prepare-direct-context
//   └─ off_topic → prepare-off-topic-context
//        ↓
// .map()                   (aplatit la sortie de branche en { message })
//        ↓
// generate-answer           (lit state.route + state.knowledgeSnippet)
//
// Le `.map()` est nécessaire car `.branch()` produit un objet indexé par step
// id (ex. `{ "prepare-hint-context": { message } }`). On l'aplatit en un
// simple `{ message }` pour que `generate-answer` garde un inputSchema lisible.
// Toute la logique de routing/contexte transite par le state, plus par les
// inputData.
export const guideStatefulWorkflow = createWorkflow({
  id: "guide-stateful-workflow",
  description: "Route a student request to a hint, direct-answer refusal, or off-topic redirect path",
  inputSchema: guideInputSchema,
  outputSchema: guideOutputSchema,
  stateSchema: guideStateSchema,
})
  .then(classifyRequestStep)
  .branch([
    [async ({ state }) => state.route === "hint", prepareHintContextStep],
    [async ({ state }) => state.route === "direct", prepareDirectContextStep],
    [async ({ state }) => state.route === "off_topic", prepareOffTopicContextStep],
  ])
  // `.branch()` retourne un objet indexé par step id. On l'aplatit en
  // `{ message }` : la route et l'indice sont déjà dans le state.
  .map(async ({ inputData }) => {
    const branchResult = Object.values(inputData).find(Boolean) as
      | z.infer<typeof guideStepOutputSchema>
      | undefined;

    return {
      message: branchResult?.message ?? "",
    };
  })
  .then(generateAnswerStep);

guideStatefulWorkflow.commit();
