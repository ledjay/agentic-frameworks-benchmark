import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { searchKnowledge } from "../tools/search-knowledge";

export const NAIF_AGENT_ID = "naif-agent";
export const NAIF_AGENT_NAME = "Naif Agent";
export const NAIF_AGENT_VERSION = "1.0.0";
export const NAIF_PROMPT_VERSION = "1.0.0";

export const naifAgent = new Agent({
  id: NAIF_AGENT_ID,
  name: NAIF_AGENT_NAME,
  instructions: `You are a naive educational agent for AnSu.
When the student asks to search, get a hint, or mentions "knowledge base", you must call the searchKnowledge tool before responding.
Do not give the answer directly.
Respond in French.`,
  model: "mistral/mistral-medium-2508",
  tools: { searchKnowledge },

  defaultOptions: {
    tracingOptions: {
      metadata: {
        traceName: NAIF_AGENT_NAME,
        version: NAIF_AGENT_VERSION,
        langfuse: {
          runtime: "mastra",
          agentId: NAIF_AGENT_ID,
          agentVersion: NAIF_AGENT_VERSION,
          promptVersion: NAIF_PROMPT_VERSION,
          promptSource: "code",
          useCase: "ansu-naive-agent",
        },
      },
      tags: [
        "ansu",
        "runtime:mastra",
        `agent:${NAIF_AGENT_ID}`,
        `agent-version:${NAIF_AGENT_VERSION}`,
        `prompt-version:${NAIF_PROMPT_VERSION}`,
      ],
    },
  },

  memory: new Memory(),
});
