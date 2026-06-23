import { z } from 'zod'

export const runtimeSchema = z.enum(['fake', 'mastra', 'langgraph-python', 'langgraph-typescript'])
export const observabilitySchema = z.enum(['none', 'langfuse', 'mlflow', 'phoenix'])
export const llmGatewaySchema = z.enum(['mock', 'albert', 'mistral', 'openai-compatible'])
export const llmConfigSchema = z.object({
  gateway: llmGatewaySchema,
  model: z.string().min(1)
})

export const teacherConfigSchema = z.object({
  niveauScolaire: z.string().min(1),
  matiere: z.string().min(1),
  notion: z.string().min(1),
  posture: z.string().min(1),
  interdits: z.array(z.string()).default([])
})

export const turnRequestSchema = z.object({
  runtime: runtimeSchema,
  observability: observabilitySchema,
  mode: z.enum(['mock', 'real']).default('mock'),
  llm: llmConfigSchema.default({ gateway: 'mock', model: 'deterministic-naive-agent' }),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  message: z.string().min(1),
  teacherConfig: teacherConfigSchema
})

export type RuntimeId = z.infer<typeof runtimeSchema>
export type LlmGateway = z.infer<typeof llmGatewaySchema>
export type LlmConfig = z.infer<typeof llmConfigSchema>
export type ObservabilityId = z.infer<typeof observabilitySchema>
export type TeacherConfig = z.infer<typeof teacherConfigSchema>
export type TurnRequest = z.infer<typeof turnRequestSchema>

export type RuntimeResult = {
  runtime: RuntimeId | 'mock' | 'langgraph' | 'mastra'
  mode: string
  runId: string
  provider: string
  model: string
  agentId?: string
  agentVersion: string
  promptVersion: string
  output: {
    answer: string
    raw?: unknown
  }
  score: {
    score: number
    reason?: string
    passed?: boolean
    scorerVersion?: string
    guardrails?: Record<string, unknown>
  }
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cost?: number
    impacts?: {
      kWh?: number
      kgCO2eq?: number
    }
    raw?: unknown
  }
  memory?: unknown
  raw?: unknown
}

export type TraceResult = {
  provider: ObservabilityId
  status: 'sent' | 'skipped' | 'error'
  traceId?: string
  url?: string
  message?: string
  raw?: unknown
}

export type TurnResponse = {
  request: TurnRequest
  runtime: RuntimeResult
  trace: TraceResult
  timings: {
    runtimeMs: number
    observabilityMs: number
    totalMs: number
  }
}

export const defaultTeacherConfig: TeacherConfig = {
  niveauScolaire: '5e',
  matiere: 'SVT',
  notion: 'la photosynthèse',
  posture: 'agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte',
  interdits: ['ne pas donner la définition complète', 'ne pas produire une correction prête à recopier']
}
