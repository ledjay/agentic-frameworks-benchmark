import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from "@mastra/core/storage";
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from "@mastra/observability";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { guideWorkflow } from "./workflows/guide-workflow";
import { guideStatefulWorkflow } from "./workflows/guide-stateful-workflow";
import { weatherAgent } from "./agents/weather-agent";
import { a2NaiveAgent } from "./agents/a2-naive-agent";
import { naifAgent } from "./agents/agent-naif";
import { guardedAgent } from "./agents/guarded-agent";
import { guideAnswerAgent } from "./agents/guide-answer-agent";
import {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { pedagogicalGuardrailScorer } from "./scorers/pedagogical-scorer";
import { LangfuseExporter } from "@mastra/langfuse";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, guideWorkflow, guideStatefulWorkflow },
  agents: { weatherAgent, a2NaiveAgent, naifAgent, guardedAgent, guideAnswerAgent },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
    pedagogicalGuardrailScorer,
  },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability"),
    },
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      langfuse: {
        serviceName: "my-service",
        exporters: [new LangfuseExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
      // default: {
      //   serviceName: "mastra",
      //   exporters: [
      //     new MastraStorageExporter(), // Persists observability events to Mastra Storage
      //     new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
      //   ],
      //   spanOutputProcessors: [
      //     new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
      //   ],
      // },
    },
  }),
});
