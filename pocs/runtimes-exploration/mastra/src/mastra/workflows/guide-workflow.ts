import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

// POC A5 — variante input/output classique.
//
// Objectif : tester un petit workflow non linéaire Mastra sans utiliser le
// workflow state. Ici, les informations nécessaires à l'étape suivante passent
// par les outputSchema des steps.
//
// Cette version est volontairement gardée à côté de `guide-stateful-workflow.ts`
// pour comparer les deux modèles :
// - input/output explicite entre steps ;
// - state partagé entre steps.

const guideRouteSchema = z.enum(["hint", "direct", "off_topic"]);

const guideInputSchema = z.object({
  message: z.string().describe("The student message to route"),
});

const classifiedRequestSchema = z.object({
  message: z.string(),
  route: guideRouteSchema,
});

// Forme commune produite par les 3 branches.
//
// Sans workflow state, le step final doit recevoir tout ce dont il a besoin via
// l'output de la branche exécutée. On force donc les branches à retourner le
// même contrat : message, route, et éventuellement knowledgeSnippet.
const routedContextSchema = z.object({
  message: z.string(),
  route: guideRouteSchema,
  knowledgeSnippet: z.string().optional(),
});

// Après `.branch()`, Mastra retourne un objet indexé par l'id du step exécuté.
// Une seule de ces clés sera présente à chaque run.
const branchOutputSchema = z.object({
  "prepare-hint-context": routedContextSchema.optional(),
  "prepare-direct-context": routedContextSchema.optional(),
  "prepare-off-topic-context": routedContextSchema.optional(),
});

const guideOutputSchema = z.object({
  route: guideRouteSchema,
  answer: z.string(),
});

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

const classifyRequestStep = createStep({
  id: "classify-request",
  description: "Classify the student request into a simple guide route",
  inputSchema: guideInputSchema,
  outputSchema: classifiedRequestSchema,
  execute: async ({ inputData }) => ({
    message: inputData.message,
    route: classifyRequest(inputData.message),
  }),
});

const prepareHintContextStep = createStep({
  id: "prepare-hint-context",
  description: "Prepare context for a hint request",
  inputSchema: classifiedRequestSchema,
  outputSchema: routedContextSchema,
  execute: async ({ inputData }) => ({
    message: inputData.message,
    route: inputData.route,
    knowledgeSnippet:
      "Observe ce qui entre dans la plante : eau, lumière, air. La terre sert-elle plutôt de nourriture ou de support ?",
  }),
});

const prepareDirectContextStep = createStep({
  id: "prepare-direct-context",
  description: "Prepare context for a direct-answer request",
  inputSchema: classifiedRequestSchema,
  outputSchema: routedContextSchema,
  execute: async ({ inputData }) => ({
    message: inputData.message,
    route: inputData.route,
  }),
});

const prepareOffTopicContextStep = createStep({
  id: "prepare-off-topic-context",
  description: "Prepare context for an off-topic request",
  inputSchema: classifiedRequestSchema,
  outputSchema: routedContextSchema,
  execute: async ({ inputData }) => ({
    message: inputData.message,
    route: inputData.route,
  }),
});

// Étape finale : récupère explicitement la branche exécutée.
//
// C'est la petite plomberie visible de la version input/output : comme la sortie
// de `.branch()` est indexée par step id, on doit sélectionner la clé présente.
const generateAnswerStep = createStep({
  id: "generate-answer",
  description: "Generate the final pedagogical answer for the selected route",
  inputSchema: branchOutputSchema,
  outputSchema: guideOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const context =
      inputData["prepare-hint-context"] ??
      inputData["prepare-direct-context"] ??
      inputData["prepare-off-topic-context"];

    if (!context) {
      throw new Error("No routed context found");
    }

    const agent = mastra?.getAgent("guideAnswerAgent");

    if (!agent) {
      throw new Error("guideAnswerAgent not found");
    }

    const prompt = `Tu es un assistant pédagogique AnSu.

Route choisie : ${context.route}
Message élève : ${context.message}
Indice disponible : ${context.knowledgeSnippet ?? "aucun"}

Règles :
- si route = hint, utilise l'indice sans donner directement la réponse ;
- si route = direct, refuse gentiment de donner la réponse directe et pose une question ;
- si route = off_topic, recentre l'élève sur l'activité ;
- réponds en français, en 3 phrases maximum.`;

    const response = await agent.generate(prompt);

    return {
      route: context.route,
      answer: response.text,
    };
  },
});

export const guideWorkflow = createWorkflow({
  id: "guide-workflow",
  description: "Route a student request with explicit input/output branch contracts",
  inputSchema: guideInputSchema,
  outputSchema: guideOutputSchema,
})
  .then(classifyRequestStep)
  .branch([
    [async ({ inputData }) => inputData.route === "hint", prepareHintContextStep],
    [async ({ inputData }) => inputData.route === "direct", prepareDirectContextStep],
    [async ({ inputData }) => inputData.route === "off_topic", prepareOffTopicContextStep],
  ])
  .then(generateAnswerStep);

guideWorkflow.commit();
