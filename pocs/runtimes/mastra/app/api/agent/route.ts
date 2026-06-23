import { NextResponse } from "next/server";
import {
  buildNaiveInstructions,
  defaultTeacherConfig,
  canonicalRaw,
  canonicalUsage,
  deterministicNaiveAnswer,
  evaluateGuardrails,
  scoreNaivety,
  type AgentTurn,
} from "../../../src/lib/ansu-contract";
import {
  getConfiguredModelId,
  getConfiguredProviderName,
} from "../../../src/lib/model-provider";

export const runtime = "nodejs";

const MASTRA_BASE_URL = process.env.MASTRA_BASE_URL ?? "http://localhost:4111";
const AGENT_VERSION = "mastra-poc-v0.1.0";
const PROMPT_VERSION = "naive-prompt-v0.1.0";

type AgentRequestBody = Partial<AgentTurn> & {
  mode?: "mock" | "mastra";
  teacherConfig?: AgentTurn["teacherConfig"] | string;
  llm?: { gateway?: string; model?: string };
};

function textFromMastra(result: unknown) {
  if (!result || typeof result !== "object") return String(result ?? "");
  const record = result as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.answer === "string") return record.answer;
  if (typeof record.content === "string") return record.content;
  if (Array.isArray(record.steps)) {
    const last = record.steps.at(-1) as Record<string, unknown> | undefined;
    if (typeof last?.text === "string") return last.text;
  }
  return JSON.stringify(result);
}
function usageFromMastra(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  const usage = record.totalUsage ?? record.usage;
  return usage && typeof usage === "object" ? usage : undefined;
}

function modelFromMastra(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  const response = record.response as Record<string, unknown> | undefined;
  if (typeof response?.modelId === "string") return response.modelId;
  const request = record.request as Record<string, unknown> | undefined;
  const requestBody = request?.body as Record<string, unknown> | undefined;
  return typeof requestBody?.model === "string" ? requestBody.model : undefined;
}

function providerFromMastra(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  const messages = Array.isArray(record.messages) ? record.messages : [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const content = (message as Record<string, unknown>).content as
      | Record<string, unknown>
      | undefined;
    const metadata = content?.metadata as Record<string, unknown> | undefined;
    if (typeof metadata?.provider === "string") return metadata.provider;
  }
  return undefined;
}

function stringField(result: unknown, field: string) {
  if (!result || typeof result !== "object") return undefined;
  const value = (result as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: AgentRequestBody;

  if (contentType.includes("application/json")) {
    body = (await request.json()) as AgentRequestBody;
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as AgentRequestBody;
  }

  const teacherConfig =
    typeof body.teacherConfig === "string"
      ? (JSON.parse(body.teacherConfig) as AgentTurn["teacherConfig"])
      : body.teacherConfig;
  const turn: AgentTurn = {
    message:
      body.message || "Donne-moi directement la réponse sur la photosynthèse.",
    userId: body.userId || "teacher-preview-demo",
    sessionId: body.sessionId || "preview-session-mastra-poc",
    teacherConfig: teacherConfig || defaultTeacherConfig,
  };
  const mode = body.mode ?? (process.env.MISTRAL_API_KEY ? "mastra" : "mock");
  const requestedGateway = body.llm?.gateway || getConfiguredProviderName();
  const requestedModel = body.llm?.model || getConfiguredModelId();
  const sessionLabel = `${turn.teacherConfig.matiere} ${turn.teacherConfig.niveauScolaire} · ${turn.teacherConfig.notion}`;
  const runId = `${turn.sessionId}:${Date.now()}`;

  if (mode === "mock") {
    const output = deterministicNaiveAnswer(turn);
    const score = scoreNaivety(turn, output);
    return NextResponse.json({
      mode,
      runtime: "mock",
      input: turn,
      memory: { thread: turn.sessionId, resource: turn.userId },
      runId,
      provider: requestedGateway,
      model: requestedModel,
      agentVersion: AGENT_VERSION,
      promptVersion: PROMPT_VERSION,
      output: { ...output, raw: canonicalRaw(turn) },
      usage: canonicalUsage(output.answer),
      score,
    });
  }

  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/agent-naif-ansu/generate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: turn.message }],
        instructions: buildNaiveInstructions(turn.teacherConfig),
        runId,
        memory: {
          thread: turn.sessionId,
          resource: turn.userId,
        },
        requestContext: {
          userId: turn.userId,
          sessionId: turn.sessionId,
          ansuDomain: "agentique",
          ansuUseCase: "agent-naif",
          ansuSessionLabel: sessionLabel,
          runId,
          agentVersion: AGENT_VERSION,
          promptVersion: PROMPT_VERSION,
          provider: getConfiguredProviderName(),
          model: getConfiguredModelId(),
          requestedLlmGateway: requestedGateway,
          requestedModel,
          messageCount: 1,
          niveauScolaire: turn.teacherConfig.niveauScolaire,
          matiere: turn.teacherConfig.matiere,
          notion: turn.teacherConfig.notion,
        },
        tracingOptions: {
          metadata: {
            userId: turn.userId,
            sessionId: turn.sessionId,
            ansuDomain: "agentique",
            ansuUseCase: "agent-naif",
            ansuSessionLabel: sessionLabel,
            runId,
            agentVersion: AGENT_VERSION,
            promptVersion: PROMPT_VERSION,
            provider: getConfiguredProviderName(),
            model: getConfiguredModelId(),
            requestedLlmGateway: requestedGateway,
            requestedModel,
            messageCount: 1,
            niveauScolaire: turn.teacherConfig.niveauScolaire,
            matiere: turn.teacherConfig.matiere,
            notion: turn.teacherConfig.notion,
          },
        },
      }),
    },
  );

  const result = await response
    .json()
    .catch(async () => ({ raw: await response.text() }));
  if (!response.ok) {
    return NextResponse.json(
      { mode, input: turn, error: result },
      { status: response.status },
    );
  }

  const answer = textFromMastra(result);
  const output = {
    answer,
    agentId: "agent-naif-ansu" as const,
    agentVersion: AGENT_VERSION,
    guardrails: evaluateGuardrails(answer),
    raw: result,
  };
  const score = scoreNaivety(turn, output);
  const model =
    modelFromMastra(result) ??
    process.env.MASTRA_MODEL ??
    requestedModel ??
    "mistral-small-latest";
  const provider = providerFromMastra(result) ?? getConfiguredProviderName() ?? requestedGateway;
  const usage = usageFromMastra(result);
  const traceId = stringField(result, "traceId");
  const spanId = stringField(result, "spanId");

  return NextResponse.json({
    mode,
    runtime: "mastra",
    input: turn,
    memory: { thread: turn.sessionId, resource: turn.userId },
    runId,
    traceId,
    spanId,
    provider,
    model,
    agentVersion: AGENT_VERSION,
    promptVersion: PROMPT_VERSION,
    usage,
    output,
    score,
  });
}
