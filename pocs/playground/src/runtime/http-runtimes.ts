import type { RuntimeResult, TurnRequest } from '@/contract/types'

function normalizeUsage(raw: unknown): RuntimeResult['usage'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  const inputTokens = Number(record.inputTokens ?? record.promptTokens ?? record.input ?? record.prompt_tokens)
  const outputTokens = Number(record.outputTokens ?? record.completionTokens ?? record.output ?? record.completion_tokens)
  const totalTokens = Number(record.totalTokens ?? record.total ?? record.total_tokens)
  const cost = Number(record.cost ?? record.totalCost ?? record.total_cost)
  const impacts = record.impacts && typeof record.impacts === 'object' ? record.impacts as Record<string, unknown> : undefined

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : undefined,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : undefined,
    cost: Number.isFinite(cost) ? cost : undefined,
    impacts: impacts
      ? {
          kWh: typeof impacts.kWh === 'number' ? impacts.kWh : undefined,
          kgCO2eq: typeof impacts.kgCO2eq === 'number' ? impacts.kgCO2eq : undefined
        }
      : undefined,
    raw
  }
}

function normalizeRuntimeResponse(request: TurnRequest, raw: unknown, fallbackRuntime: RuntimeResult['runtime']): RuntimeResult {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const output = record.output && typeof record.output === 'object' ? record.output as Record<string, unknown> : {}
  const score = record.score && typeof record.score === 'object' ? record.score as Record<string, unknown> : {}
  const answer = typeof output.answer === 'string' ? output.answer : typeof record.answer === 'string' ? record.answer : JSON.stringify(raw)
  const scoreValue = Number(score.score ?? score.value ?? record.naivetyScore ?? 0)

  return {
    runtime: fallbackRuntime,
    mode: typeof record.mode === 'string' ? record.mode : request.mode,
    runId: typeof record.runId === 'string' ? record.runId : `${request.sessionId}:${Date.now()}`,
    provider: typeof record.provider === 'string' ? record.provider : request.llm.gateway,
    model: typeof record.model === 'string' ? record.model : request.llm.model,
    agentId: typeof record.agentId === 'string' ? record.agentId : undefined,
    agentVersion: typeof record.agentVersion === 'string' ? record.agentVersion : 'unknown',
    promptVersion: typeof record.promptVersion === 'string' ? record.promptVersion : 'unknown',
    output: { answer, raw: output.raw ?? raw },
    score: {
      score: Number.isFinite(scoreValue) ? scoreValue : 0,
      passed: typeof score.passed === 'boolean' ? score.passed : (Number.isFinite(scoreValue) ? scoreValue >= 1 : undefined),
      reason: typeof score.reason === 'string' ? score.reason : undefined,
      scorerVersion: typeof score.scorerVersion === 'string' ? score.scorerVersion : undefined,
      guardrails: score.guardrails && typeof score.guardrails === 'object' ? score.guardrails as Record<string, unknown> : undefined
    },
    usage: normalizeUsage(record.usage),
    memory: record.memory,
    raw
  }
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  })
  const text = await response.text()
  const json = text.trim() ? JSON.parse(text) as unknown : null
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${text.slice(0, 400)}`)
  return json
}

export async function runMastraRuntime(request: TurnRequest): Promise<RuntimeResult> {
  const url = process.env.MASTRA_PLAYGROUND_API_URL ?? 'http://localhost:3009/api/agent'
  const raw = await postJson(url, {
    mode: request.mode === 'real' ? 'mastra' : 'mock',
    sessionId: request.sessionId,
    userId: request.userId,
    message: request.message,
    teacherConfig: request.teacherConfig,
    llm: request.llm
  })
  return normalizeRuntimeResponse(request, raw, 'mastra')
}

export async function runLangGraphRuntime(request: TurnRequest): Promise<RuntimeResult> {
  const base = process.env.LANGGRAPH_API_URL ?? 'http://localhost:3010'
  const raw = await postJson(`${base}/api/agent`, {
    mode: request.mode === 'real' ? 'langgraph' : 'mock',
    sessionId: request.sessionId,
    userId: request.userId,
    message: request.message,
    teacherConfig: request.teacherConfig,
    llm: request.llm
  })
  return normalizeRuntimeResponse(request, raw, 'langgraph-python')
}


export async function runLangGraphTypeScriptRuntime(request: TurnRequest): Promise<RuntimeResult> {
  const base = process.env.LANGGRAPH_TS_API_URL ?? 'http://localhost:3014'
  const raw = await postJson(`${base}/api/agent`, {
    mode: request.mode === 'real' ? 'langgraph' : 'mock',
    sessionId: request.sessionId,
    userId: request.userId,
    message: request.message,
    teacherConfig: request.teacherConfig,
    llm: request.llm
  })
  return normalizeRuntimeResponse(request, raw, 'langgraph-typescript')
}
