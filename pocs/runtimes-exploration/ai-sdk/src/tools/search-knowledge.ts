import { tool } from "ai";
import { z } from "zod";

export const searchKnowledge = tool({
  description:
    "Searches the knowledge base for relevant information based on the provided query.",
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    hint: z.string(),
    source: z.string(),
  }),
  execute: async ({ query }) => {
    return {
      hint: `This is a hint for the query: ${query}`,
      source: "Knowledge Base",
    };
  },
});
