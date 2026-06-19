import { NextResponse } from "next/server";
import { z } from "zod";
import {
  expectedNotions,
  notionAssessmentSchema,
  type NotionAssessment,
} from "../../../../src/lib/ansu-contract";

export const runtime = "nodejs";

const MASTRA_BASE_URL = process.env.MASTRA_BASE_URL ?? "http://localhost:4111";
const assessmentJsonSchema = z.toJSONSchema(notionAssessmentSchema);

type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssessmentRequest = {
  mode?: "mock" | "mastra";
  sessionId?: string;
  userId?: string;
  transcript?: TranscriptMessage[];
};

function deterministicAssessment(
  transcript: TranscriptMessage[],
): NotionAssessment {
  const studentText = transcript
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n")
    .toLowerCase();

  const hasLight = /lumi[eè]re|soleil/.test(studentText);
  const saysEatLight = /mange.*lumi[eè]re|lumi[eè]re.*nourriture/.test(
    studentText,
  );
  const hasOwnWords = studentText.split(/\s+/).filter(Boolean).length > 12;

  const notions = expectedNotions.map((notion) => {
    if (notion.id === "lumiere_role") {
      return {
        ...notion,
        understood: hasLight,
        evidence: hasLight
          ? "L’élève mentionne la lumière ou le soleil."
          : null,
      };
    }
    if (notion.id === "lumiere_pas_nourriture") {
      return {
        ...notion,
        understood: hasLight && !saysEatLight,
        evidence:
          hasLight && !saysEatLight
            ? "L’élève ne formule pas la lumière comme une nourriture."
            : null,
      };
    }
    return {
      ...notion,
      understood: hasOwnWords,
      evidence: hasOwnWords
        ? "L’élève développe une formulation personnelle."
        : null,
    };
  });

  return {
    notions,
    readyForNextStep: notions.every((notion) => notion.understood),
    summary: notions.every((notion) => notion.understood)
      ? "Les notions attendues semblent comprises dans le transcript local."
      : "Certaines notions restent à consolider.",
  };
}

function parseMastraAssessment(result: unknown) {
  const record =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};
  const rawObject = record.object ?? record.experimental_output;
  if (rawObject) return notionAssessmentSchema.parse(rawObject);
  if (typeof record.text === "string")
    return notionAssessmentSchema.parse(JSON.parse(record.text));
  return notionAssessmentSchema.parse(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as AssessmentRequest;
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  const mode = body.mode ?? (process.env.MISTRAL_API_KEY ? "mastra" : "mock");
  const runId = `${
    body.sessionId ?? "assessment-session"
  }:assessment:${Date.now()}`;

  if (mode === "mock") {
    return NextResponse.json({
      mode,
      runtime: "mock",
      runId,
      assessment: deterministicAssessment(transcript),
      schemaValidated: true,
    });
  }

  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/agent-evaluateur-comprehension-ansu/generate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: JSON.stringify({ transcript, expectedNotions }, null, 2),
          },
        ],
        runId,
        structuredOutput: {
          schema: assessmentJsonSchema,
        },
        requestContext: {
          userId: body.userId ?? "teacher-preview-demo",
          sessionId: body.sessionId,
          ansuUseCase: "structured-assessment",
          runId,
        },
        tracingOptions: {
          metadata: {
            userId: body.userId ?? "teacher-preview-demo",
            sessionId: body.sessionId,
            ansuUseCase: "structured-assessment",
            runId,
          },
        },
      }),
    },
  );

  const result = await response
    .json()
    .catch(async () => ({ raw: await response.text() }));
  if (!response.ok)
    return NextResponse.json(
      { mode, error: result },
      { status: response.status },
    );

  const assessment = parseMastraAssessment(result);

  return NextResponse.json({
    mode,
    runtime: "mastra",
    runId,
    traceId: typeof result.traceId === "string" ? result.traceId : undefined,
    spanId: typeof result.spanId === "string" ? result.spanId : undefined,
    usage: result.totalUsage ?? result.usage,
    assessment,
    schemaValidated: true,
    raw: result,
  });
}
