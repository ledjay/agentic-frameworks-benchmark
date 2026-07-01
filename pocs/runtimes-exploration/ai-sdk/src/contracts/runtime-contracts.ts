import { z } from "zod";

export const AgentTurnRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  message: z.string().min(1),
});

export type AgentTurnRequest = z.infer<typeof AgentTurnRequestSchema>;

export const AgentTurnResponseSchema = z.object({
  sessionId: z.string(),
  answer: z.string(),
});

export type AgentTurnResponse = z.infer<typeof AgentTurnResponseSchema>;
