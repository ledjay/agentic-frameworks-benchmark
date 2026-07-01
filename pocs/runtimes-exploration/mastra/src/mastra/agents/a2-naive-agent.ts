import { Agent } from "@mastra/core/agent";

export const A2_NAIVE_AGENT_ID = "a2-naive-agent";
export const A2_NAIVE_AGENT_NAME = "A2 Naive Agent";
export const A2_NAIVE_AGENT_VERSION = "1.0.0";
export const A2_NAIVE_PROMPT_VERSION = "1.0.0";

export const a2NaiveAgent = new Agent({
  id: A2_NAIVE_AGENT_ID,
  name: A2_NAIVE_AGENT_NAME,
  instructions:
    "Tu es un assistant pédagogique AnSu. " +
    "Réponds en français, de façon courte, claire et guidante.",
  model: "mistral/mistral-medium-2508",
  defaultOptions: {
    tracingOptions: {
      metadata: {
        traceName: A2_NAIVE_AGENT_NAME,
        version: A2_NAIVE_AGENT_VERSION,
        langfuse: {
          runtime: "mastra",
          agentId: A2_NAIVE_AGENT_ID,
          agentVersion: A2_NAIVE_AGENT_VERSION,
          promptVersion: A2_NAIVE_PROMPT_VERSION,
          promptSource: "code",
          useCase: "ansu-a2-naive-agent",
        },
      },
      tags: [
        "ansu",
        "runtime:mastra",
        `agent:${A2_NAIVE_AGENT_ID}`,
        `agent-version:${A2_NAIVE_AGENT_VERSION}`,
        `prompt-version:${A2_NAIVE_PROMPT_VERSION}`,
        "a2-naive-agent",
      ],
    },
  },
});
