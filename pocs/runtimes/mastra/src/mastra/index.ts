import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import {
  Observability,
  ConsoleExporter,
  MastraStorageExporter,
} from "@mastra/observability";
import { naiveAgent } from "./agents/naive-agent";
import { assessmentAgent } from "./agents/assessment-agent";
import { naivetyContractScorer } from "./scorers/naivety-contract";

const projectRoot = process.env.INIT_CWD ?? process.env.PWD ?? process.cwd();

const storage = new LibSQLStore({
  id: "ansu-mastra-storage",
  url: process.env.MASTRA_STORAGE_URL ?? `file:${projectRoot}/data/mastra.db`,
});

export const mastra = new Mastra({
  storage,
  agents: {
    naiveAgent,
    assessmentAgent,
  },
  scorers: {
    naivetyContract: naivetyContractScorer,
  },
  observability: new Observability({
    configs: {
      default: {
        serviceName: "ansu-mastra-runtime",
        exporters: [
          new MastraStorageExporter({ maxBatchWaitMs: 250 }),
          new ConsoleExporter({ logLevel: "warn" }),
        ],
      },
    },
  }),
  environment: process.env.NODE_ENV ?? "development",
});
