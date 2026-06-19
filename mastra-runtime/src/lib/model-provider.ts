import { mistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ALBERT_BASE_URL =
  process.env.ALBERT_BASE_URL ?? "https://albert.api.etalab.gouv.fr/v1";
const ALBERT_MODEL = process.env.ALBERT_MODEL ?? "albert-large";
const MISTRAL_MODEL =
  process.env.MASTRA_MODEL ??
  process.env.MISTRAL_MODEL ??
  "mistral-small-latest";

export function getConfiguredProvider() {
  return process.env.MASTRA_PROVIDER === "albert" ? "albert" : "mistral";
}

export function getConfiguredModelId() {
  return getConfiguredProvider() === "albert" ? ALBERT_MODEL : MISTRAL_MODEL;
}

export function getConfiguredProviderName() {
  return getConfiguredProvider() === "albert" ? "albert" : "mistral.chat";
}

export function createConfiguredModel() {
  if (getConfiguredProvider() === "albert") {
    const albert = createOpenAICompatible({
      baseURL: ALBERT_BASE_URL,
      name: "albert",
      apiKey: process.env.ALBERT_API_KEY,
      supportsStructuredOutputs: true,
    });

    return albert.chatModel(ALBERT_MODEL);
  }

  return mistral(MISTRAL_MODEL);
}
