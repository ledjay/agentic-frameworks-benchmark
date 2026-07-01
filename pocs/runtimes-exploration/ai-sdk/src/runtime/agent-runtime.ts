import type {
  AgentTurnRequest,
  AgentTurnResponse,
} from "../contracts/runtime-contracts.js";

import type { ModelMessage } from "ai";
import { generateText, stepCountIs } from "ai";
import { mistral } from "@ai-sdk/mistral";
import "dotenv/config";
import { searchKnowledge } from "../tools/search-knowledge.js";

const messages: ModelMessage[] = [];

export const agentTurn = async (
  request: AgentTurnRequest,
): Promise<AgentTurnResponse> => {
  const result = await generateText({
    model: mistral("mistral-large-latest"),
    system: `
  Tu es un agent pédagogique naïf pour AnSu.
  Quand l'élève demande de chercher, d'obtenir un
  indice, ou mentionne "base de connaissances", tu
  dois appeler le tool searchKnowledge avant de
  répondre.
  Ne donne pas directement la réponse.
  Réponds en français.
  `,
    prompt: request.message,
    tools: {
      searchKnowledge,
    },
    toolChoice: "required",
  });

  console.log("toolCalls", result.toolCalls);
  console.log("toolResults", result.toolResults);
  console.log("steps", result.steps);

  return {
    sessionId: request.sessionId,
    answer: result.text,
  };
};
