import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const searchKnowledgeTool = createTool({
  id: "searchKnowledge",
  description:
    "Cherche une courte ressource pédagogique sur une notion scolaire. À utiliser quand l’élève demande un indice ou une ressource.",
  inputSchema: z.object({
    query: z.string(),
    notion: z.string().optional(),
  }),
  outputSchema: z.object({
    sources: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        excerpt: z.string(),
      }),
    ),
  }),
  execute: async ({ query, notion }) => ({
    sources: [
      {
        id: "svt-photosynthese-lumiere-v0",
        title: "Indice photosynthèse — rôle de la lumière",
        excerpt: `Pour ${
          notion ?? query
        }, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.`,
      },
    ],
  }),
});
