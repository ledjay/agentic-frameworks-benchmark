import { Agent } from "@mastra/core/agent";
import { createConfiguredModel } from "../../lib/model-provider";

export const assessmentAgent = new Agent({
  id: "agent-evaluateur-comprehension-ansu",
  name: "Évaluateur compréhension AnSu",
  description:
    "Agent d’évaluation qui analyse un transcript et produit une checklist structurée de notions comprises.",
  instructions: `Tu es un évaluateur pédagogique AnSu.
Analyse uniquement le transcript fourni.
Pour chaque notion attendue, indique si l'élève l'a réellement comprise.
Réponds strictement avec un objet JSON conforme au schéma demandé.
Si une preuve n'existe pas dans le transcript, mets understood=false et evidence=null.`,
  model: createConfiguredModel(),
  metadata: {
    ansuDomain: "agentique",
    ansuUseCase: "structured-assessment",
    ansuVersion: "mastra-poc-v0.1.0",
  },
});
