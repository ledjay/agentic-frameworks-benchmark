import { Agent } from "@mastra/core/agent";

// Agent interne utilisé uniquement par les workflows de routing A5.
//
// Contrairement à `naifAgent`, il ne définit pas de `defaultOptions.tracingOptions`.
// Objectif : éviter qu'un appel agent imbriqué dans un workflow renomme ou
// brouille la trace Langfuse du workflow parent.
export const guideAnswerAgent = new Agent({
  id: "guide-answer-agent",
  name: "Guide Answer Agent",
  instructions:
    "Tu es un assistant pédagogique AnSu. " +
    "Réponds en français, de façon courte, claire et guidante. " +
    "Respecte strictement la route et les règles fournies dans le prompt.",
  model: "mistral/mistral-medium-2508",
});
