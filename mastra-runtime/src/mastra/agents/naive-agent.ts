import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createConfiguredModel } from "../../lib/model-provider";
import {
  buildNaiveInstructions,
  defaultTeacherConfig,
} from "../../lib/ansu-contract";
import { naivetyContractScorer } from "../scorers/naivety-contract";
import { searchKnowledgeTool } from "../tools/knowledge-tool";

export const naiveAgent = new Agent({
  id: "agent-naif-ansu",
  name: "Agent naïf AnSu",
  description:
    "Agent pédagogique qui aide l’élève à verbaliser sans donner la réponse experte.",
  instructions: buildNaiveInstructions(defaultTeacherConfig),
  model: createConfiguredModel(),
  tools: {
    searchKnowledge: searchKnowledgeTool,
  },
  memory: new Memory({
    options: {
      lastMessages: 12,
      semanticRecall: false,
      generateTitle: false,
    },
  }),
  scorers: {
    naivetyContract: {
      scorer: naivetyContractScorer,
      sampling: { type: "ratio", rate: 1 },
    },
  },
  metadata: {
    ansuDomain: "agentique",
    ansuUseCase: "agent-naif",
    ansuVersion: "mastra-poc-v0.1.0",
  },
});
