import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { agentTurn } from "./runtime/agent-runtime.js";
import {
  AgentTurnRequestSchema,
  AgentTurnResponseSchema,
} from "./contracts/runtime-contracts.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/agent/turn", async (c) => {
  const body = await c.req.json();

  try {
    const turnRequest = AgentTurnRequestSchema.parse(body);
    const turnResponse = await agentTurn(turnRequest);
    const response = AgentTurnResponseSchema.parse(turnResponse);

    console.log("Received request:", turnRequest);
    console.log("Sending response:", response);

    return c.json(response);
  } catch (error) {
    console.error("Error processing request:", error);
    return c.json({ error: "Invalid request format" }, 400);
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3022,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
