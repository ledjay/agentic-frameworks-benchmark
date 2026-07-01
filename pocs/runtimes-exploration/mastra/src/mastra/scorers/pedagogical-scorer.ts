import { createScorer } from "@mastra/core/evals";
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from "@mastra/evals/scorers/utils";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

export const pedagogicalGuardrailScorer = createScorer({
  id: "pedagogical-guardrail-scorer",
  name: "Pedagogical Guardrail",
  description:
    "Checks whether an AnSu answer keeps a guided pedagogical posture instead of giving a direct answer.",
  type: "agent",
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || "";
    const assistantText = getAssistantMessageFromRunOutput(run.output) || "";
    const normalizedAssistantText = normalize(assistantText);

    const directAnswerSignals = [
      "la reponse est",
      "la bonne reponse est",
      "il faut repondre",
      "en fait, les plantes",
      "les plantes ne mangent pas",
    ];

    const guidanceSignals = [
      "observe",
      "hypothese",
      "que remarques-tu",
      "qu'en penses-tu",
      "a ton avis",
      "peux-tu",
      "essaie",
      "indice",
    ];

    return {
      userText,
      assistantText,
      hasQuestion: assistantText.includes("?"),
      isShort: assistantText.split(/\s+/).filter(Boolean).length <= 80,
      hasGuidanceSignal: includesAny(normalizedAssistantText, guidanceSignals),
      hasDirectAnswerSignal: includesAny(normalizedAssistantText, directAnswerSignals),
    };
  })
  .generateScore(({ results }) => {
    const r = results.preprocessStepResult;

    let score = 0;

    if (r.hasQuestion) score += 0.35;
    if (r.hasGuidanceSignal) score += 0.35;
    if (r.isShort) score += 0.2;
    if (!r.hasDirectAnswerSignal) score += 0.1;

    if (r.hasDirectAnswerSignal) score -= 0.4;

    return Math.max(0, Math.min(1, score));
  })
  .generateReason(({ results, score }) => {
    const r = results.preprocessStepResult;
    const checks = [
      `question=${r.hasQuestion}`,
      `guidance=${r.hasGuidanceSignal}`,
      `short=${r.isShort}`,
      `directAnswerSignal=${r.hasDirectAnswerSignal}`,
    ].join(", ");

    return `Pedagogical guardrail score=${score}. ${checks}.`;
  });
