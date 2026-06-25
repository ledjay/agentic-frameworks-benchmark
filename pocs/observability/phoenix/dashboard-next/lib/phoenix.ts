const PHOENIX_BASE_URL =
  process.env.PHOENIX_BASE_URL ?? "http://127.0.0.1:6006";

export type PhoenixProject = {
  id: string;
  name: string;
  description: string | null;
};

export type PhoenixTrace = {
  id: string;
  trace_id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  token_count_prompt: number;
  token_count_completion: number;
  token_count_total: number;
  spans: PhoenixSpan[] | null;
};

export type PhoenixSpan = {
  id: string;
  name: string;
  context: {
    trace_id: string;
    span_id: string;
  };
  span_kind: string;
  parent_id: string | null;
  start_time: string;
  end_time: string;
  status_code: string;
  status_message: string;
  attributes: Record<string, unknown>;
  events: unknown[];
};

export type PhoenixTraceAnnotation = {
  id?: string;
  name: string;
  annotator_kind: "LLM" | "CODE" | "HUMAN";
  result?: {
    label?: string | null;
    score?: number | null;
    explanation?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  identifier?: string;
  trace_id: string;
  created_at?: string;
  updated_at?: string;
};

export type PhoenixPrompt = {
  id: string;
  name: string;
  description: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PhoenixPromptVersion = {
  id: string;
  description: string | null;
  model_provider: string;
  model_name: string;
  template: {
    type: "chat";
    messages: { role: string; content: string }[];
  };
  template_type: string;
  template_format: string;
  invocation_parameters: Record<string, unknown>;
};

export type PhoenixDataset = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  example_count: number;
};

export type PhoenixDatasetExample = {
  id: string;
  node_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata: Record<string, unknown>;
  updated_at: string;
};

export type PhoenixExperiment = {
  id: string;
  dataset_id: string;
  dataset_version_id: string;
  name: string | null;
  description: string | null;
  repetitions: number;
  metadata: Record<string, unknown>;
  project_name: string | null;
  created_at: string;
  updated_at: string;
  example_count: number;
  successful_run_count: number;
  failed_run_count: number;
  missing_run_count: number;
};

export type PhoenixAnnotationConfig = {
  id: string;
  name: string;
  type: "CATEGORICAL" | "CONTINUOUS" | "FREEFORM";
  description?: string | null;
  optimization_direction?: "MINIMIZE" | "MAXIMIZE" | "NONE" | null;
  values?: { label: string; score?: number | null }[];
  lower_bound?: number | null;
  upper_bound?: number | null;
};

type PhoenixList<T> = {
  data: T[];
  next_cursor: string | null;
};

async function phoenixFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PHOENIX_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Phoenix API ${response.status} on ${path}: ${text.slice(0, 500)}`,
    );
  }

  const text = await response.text();
  if (!text.trim()) return undefined as T;

  return JSON.parse(text) as T;
}

function withSearch(
  path: string,
  params: Record<string, string | number | boolean | string[] | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function getProjects() {
  return phoenixFetch<PhoenixList<PhoenixProject>>("/v1/projects");
}

export async function getProject(projectName: string) {
  return phoenixFetch<{ data: PhoenixProject }>(
    `/v1/projects/${encodeURIComponent(projectName)}`,
  );
}

export async function getTraces(projectName: string, limit = 25) {
  return phoenixFetch<PhoenixList<PhoenixTrace>>(
    withSearch(`/v1/projects/${encodeURIComponent(projectName)}/traces`, {
      limit,
      order: "desc",
      sort: "start_time",
    }),
  );
}

export async function getTrace(projectName: string, traceId: string) {
  const traces = await getTraces(projectName, 100);
  const found = traces.data.find((trace) => trace.trace_id === traceId);
  if (!found)
    throw new Error(`Trace ${traceId} not found in project ${projectName}`);
  return found;
}

export async function getTraceSpans(projectName: string, traceId: string) {
  return phoenixFetch<PhoenixList<PhoenixSpan>>(
    withSearch(`/v1/projects/${encodeURIComponent(projectName)}/spans`, {
      trace_id: [traceId],
      limit: 1000,
    }),
  );
}

export async function getTraceAnnotations(
  projectName: string,
  traceId: string,
) {
  return phoenixFetch<PhoenixList<PhoenixTraceAnnotation>>(
    withSearch(
      `/v1/projects/${encodeURIComponent(projectName)}/trace_annotations`,
      {
        trace_ids: [traceId],
        limit: 100,
      },
    ),
  );
}

export async function annotateTrace(input: {
  traceId: string;
  label: string;
  score: number;
  explanation: string;
  teacherId?: string;
}) {
  return phoenixFetch<{ data: PhoenixTraceAnnotation[] }>(
    "/v1/trace_annotations?sync=true",
    {
      method: "POST",
      body: JSON.stringify({
        data: [
          {
            trace_id: input.traceId,
            name: "teacher_feedback",
            annotator_kind: "HUMAN",
            identifier: `teacher-feedback:${input.teacherId ?? "demo-teacher"}`,
            result: {
              label: input.label,
              score: input.score,
              explanation: input.explanation,
            },
            metadata: {
              source: "next-dashboard-demo",
              teacher_id: input.teacherId ?? "demo-teacher",
            },
          },
        ],
      }),
    },
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function durationMs(start: string, end: string) {
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
}

export function shortId(value: string, size = 8) {
  return `${value.slice(0, size)}…${value.slice(-4)}`;
}

export function attrString(attributes: Record<string, unknown>, key: string) {
  const value = attributes[key];
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

export async function getPrompts() {
  return phoenixFetch<PhoenixList<PhoenixPrompt>>("/v1/prompts");
}

export async function getPromptVersions(promptName: string) {
  return phoenixFetch<PhoenixList<PhoenixPromptVersion>>(
    `/v1/prompts/${encodeURIComponent(promptName)}/versions`,
  );
}

export async function createPromptVersion(input: {
  name: string;
  description: string;
  systemPrompt: string;
  userTemplate: string;
  modelProvider: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "OLLAMA";
  modelName: string;
  tag?: string;
}) {
  const providerType = "openai";
  const invocationKey = "openai";
  const version = await phoenixFetch<{ data: PhoenixPromptVersion }>(
    "/v1/prompts",
    {
      method: "POST",
      body: JSON.stringify({
        prompt: {
          name: input.name,
          description: input.description,
          metadata: { source: "next-dashboard-poc" },
        },
        version: {
          description: input.description,
          model_provider: input.modelProvider,
          model_name: input.modelName,
          template: {
            type: "chat",
            messages: [
              { role: "system", content: input.systemPrompt },
              { role: "user", content: input.userTemplate },
            ],
          },
          template_type: "CHAT",
          template_format: "MUSTACHE",
          invocation_parameters: {
            type: providerType,
            [invocationKey]: { temperature: 0.2, max_tokens: 800 },
          },
          tools: null,
          response_format: null,
        },
      }),
    },
  );

  if (input.tag) {
    await tagPromptVersion(version.data.id, input.tag);
  }

  return version;
}

export async function tagPromptVersion(promptVersionId: string, tag: string) {
  return phoenixFetch(
    `/v1/prompt_versions/${encodeURIComponent(promptVersionId)}/tags`,
    {
      method: "POST",
      body: JSON.stringify({
        name: tag,
        description: `Tag ${tag} créé depuis le dashboard Next`,
      }),
    },
  );
}

export async function getAnnotationConfigs() {
  return phoenixFetch<PhoenixList<PhoenixAnnotationConfig>>(
    "/v1/annotation_configs",
  );
}

export async function createAnnotationConfig(input: {
  name: string;
  type: "CATEGORICAL" | "CONTINUOUS" | "FREEFORM";
  description: string;
}) {
  const base = {
    name: input.name,
    type: input.type,
    description: input.description,
  };
  const data =
    input.type === "CATEGORICAL"
      ? {
          ...base,
          optimization_direction: "MAXIMIZE",
          values: [
            { label: "pass", score: 1 },
            { label: "partial", score: 0.5 },
            { label: "fail", score: 0 },
          ],
        }
      : input.type === "CONTINUOUS"
        ? {
            ...base,
            optimization_direction: "MAXIMIZE",
            lower_bound: 0,
            upper_bound: 1,
          }
        : {
            ...base,
            optimization_direction: "NONE",
            threshold: null,
            lower_bound: null,
            upper_bound: null,
          };

  return phoenixFetch<{ data: PhoenixAnnotationConfig }>(
    "/v1/annotation_configs",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function getDatasets() {
  return phoenixFetch<PhoenixList<PhoenixDataset>>("/v1/datasets");
}

export async function createDemoDataset() {
  return phoenixFetch<{ data: PhoenixDataset }>("/v1/datasets/upload", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      name: `ansu-demo-eval-${Date.now()}`,
      description:
        "Dataset POC créé depuis le dashboard Next pour tester les experiments Phoenix.",
      inputs: [
        {
          question: "Quel est le besoin prioritaire du POC agentique AnSu v5 ?",
        },
        {
          question:
            "Quels garde-fous faut-il tracer pour une réponse agentique AnSu ?",
        },
      ],
      outputs: [
        {
          expected:
            "Un agent unique avec modération input/output, observabilité OpenTelemetry et evals.",
        },
        {
          expected:
            "Modération input, modération output, sources, scores d’évaluation et erreurs.",
        },
      ],
      metadata: [
        { source: "dashboard-next-poc", difficulty: "easy" },
        { source: "dashboard-next-poc", difficulty: "medium" },
      ],
    }),
  });
}

export async function getDatasetExamples(datasetId: string) {
  return phoenixFetch<{
    data: {
      dataset_id: string;
      version_id: string;
      examples: PhoenixDatasetExample[];
    };
  }>(`/v1/datasets/${encodeURIComponent(datasetId)}/examples`);
}

export async function createExperiment(datasetId: string, name: string) {
  return phoenixFetch<{ data: PhoenixExperiment }>(
    `/v1/datasets/${encodeURIComponent(datasetId)}/experiments`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description:
          "Experiment POC lancé depuis le dashboard Next. Le runner est mocké.",
        metadata: { source: "next-dashboard-poc", runner: "mock" },
        repetitions: 1,
      }),
    },
  );
}

export async function getExperiments(datasetId: string) {
  return phoenixFetch<PhoenixList<PhoenixExperiment>>(
    `/v1/datasets/${encodeURIComponent(datasetId)}/experiments`,
  );
}

export async function createMockExperimentRun(input: {
  experimentId: string;
  example: PhoenixDatasetExample;
}) {
  const start = new Date();
  const end = new Date(start.getTime() + 37);
  const run = await phoenixFetch<{ data: { id: string } }>(
    `/v1/experiments/${encodeURIComponent(input.experimentId)}/runs`,
    {
      method: "POST",
      body: JSON.stringify({
        dataset_example_id: input.example.id,
        output: {
          task_output:
            "Réponse mockée du runner AnSu : agent unique, modération, OpenTelemetry et evals sont requis.",
        },
        repetition_number: 1,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        trace_id: null,
        error: null,
      }),
    },
  );

  const evalStart = new Date();
  const evalEnd = new Date(evalStart.getTime() + 12);
  await phoenixFetch("/v1/experiment_evaluations", {
    method: "POST",
    body: JSON.stringify({
      experiment_run_id: run.data.id,
      name: "poc_contract_score",
      annotator_kind: "CODE",
      start_time: evalStart.toISOString(),
      end_time: evalEnd.toISOString(),
      result: {
        label: "pass",
        score: 1,
        explanation:
          "Le runner mocké produit une réponse conforme au contrat POC.",
      },
      error: null,
      metadata: { source: "next-dashboard-poc" },
      trace_id: null,
    }),
  });

  return run;
}
