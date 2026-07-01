import { z } from "zod";
import { createTool } from "@mastra/core/tools";

export const searchKnowledge = createTool({
  id: "search-knowledge",
  description: "Search for knowledge in the AnSu knowledge base",
  inputSchema: z.object({
    query: z.string().describe("The query to search for"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
        url: z.string(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    return {
      results: [
        {
          title: "Indice N°1",
          snippet: `Indice mocké pour la recherche : ${query}. Observe ce qui entre dans la plante : eau, lumière, air. La terre sert-elle plutôt de nourriture ou de support ?`,
          url: "#",
        },
      ],
    };
  },
});
