import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const MLFLOW_BASE_URL = process.env.MLFLOW_BASE_URL ?? 'http://127.0.0.1:5001'
const EXPERIMENT_NAME = process.env.MLFLOW_EXPERIMENT_NAME ?? 'ansu-mlflow-genai-demo'

export type MlflowExperiment = {
  experiment_id: string
  name: string
  artifact_location: string
  lifecycle_stage: string
  creation_time: number
  last_update_time: number
}

export type MlflowRun = {
  info: {
    run_id: string
    run_name?: string
    status: string
    start_time: number
    end_time?: number
  }
  data: {
    metrics?: Array<{ key: string; value: number; timestamp: number; step: number }>
    params?: Array<{ key: string; value: string }>
    tags?: Array<{ key: string; value: string }>
  }
}

export type MlflowTrace = {
  trace_id: string
  state: string
  request_time: string
  execution_duration: number
  request: unknown
  response: unknown
  metadata: Record<string, string>
  tags: Record<string, string>
  assessments: unknown
  span_count: number
}

export type MlflowTraceDetail = MlflowTrace & {
  spans: Array<Record<string, unknown>>
}

export type MlflowPrompt = {
  name?: string
  description?: string
  tags?: Record<string, string>
  latest?: Record<string, unknown>
  latest_error?: string
}

export type ResearchSummary = {
  total_traces: number
  sessions: number
  notions: string[]
  direct_answer_refusals: number
  drift_failures: number
  naivety_proxy_score: number
}

type MlflowRestTrace = {
  trace_id: string
  request_time: string
  execution_duration: string
  state: string
  trace_metadata?: Record<string, string>
  tags?: Record<string, string>
  assessments?: unknown
  request_preview?: string
  response_preview?: string
}

type MlflowBatchTrace = {
  trace_info: MlflowRestTrace
  spans?: Array<Record<string, unknown>>
}

async function mlflowFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MLFLOW_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers
    }
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`MLflow API ${response.status} on ${path}: ${text.slice(0, 500)}`)
  }
  return text.trim() ? (JSON.parse(text) as T) : (undefined as T)
}

async function bridge<T>(command: string, ...args: string[]): Promise<T> {
  const python = process.env.MLFLOW_PYTHON ?? '../.venv/bin/python'
  const script = path.join(process.cwd(), 'scripts', 'mlflow_bridge.py')
  const { stdout, stderr } = await execFileAsync(python, [script, command, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MLFLOW_BASE_URL,
      MLFLOW_EXPERIMENT_NAME: EXPERIMENT_NAME
    },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 15_000
  })
  if (stderr && !stderr.includes('FutureWarning')) {
    // Keep warnings visible in server logs without failing the POC UI.
    console.warn(stderr)
  }
  return JSON.parse(stdout) as T
}

export async function searchExperiments() {
  return mlflowFetch<{ experiments: MlflowExperiment[] }>('/api/2.0/mlflow/experiments/search', {
    method: 'POST',
    body: JSON.stringify({ max_results: 100 })
  })
}

export async function getExperimentByName(name = EXPERIMENT_NAME) {
  const experiments = await searchExperiments()
  return experiments.experiments.find((experiment) => experiment.name === name)
}

export async function searchRuns(experimentIds: string[]) {
  return mlflowFetch<{ runs?: MlflowRun[] }>('/api/2.0/mlflow/runs/search', {
    method: 'POST',
    body: JSON.stringify({ experiment_ids: experimentIds, max_results: 100 })
  })
}

export async function searchTraces() {
  const experiment = await getExperimentByName()
  if (!experiment) return { data: [] }

  const result = await mlflowFetch<{ traces?: MlflowRestTrace[] }>('/api/3.0/mlflow/traces/search', {
    method: 'POST',
    body: JSON.stringify({
      locations: [{ mlflow_experiment: { experiment_id: experiment.experiment_id } }],
      max_results: 100
    })
  })

  return { data: (result.traces ?? []).map(mapRestTrace) }
}

export async function getTrace(traceId: string) {
  const result = await mlflowFetch<{ traces?: MlflowBatchTrace[] }>(
    `/api/3.0/mlflow/traces/batchGet?trace_ids=${encodeURIComponent(traceId)}`
  )
  const trace = result.traces?.[0]
  if (!trace) throw new Error(`Trace not found: ${traceId}`)
  return { ...mapRestTrace(trace.trace_info), spans: trace.spans ?? [] }
}

export async function searchPrompts() {
  return bridge<{ data: MlflowPrompt[] }>('prompts')
}

export async function getResearchSummary() {
  const traces = await searchTraces()
  const sessions = new Set<string>()
  const notions = new Set<string>()
  let directAnswerRefusals = 0
  let driftFailures = 0

  for (const trace of traces.data) {
    sessions.add(trace.metadata['mlflow.trace.session'] ?? 'unknown')
    notions.add(trace.metadata['ansu.sequence.notion'] ?? 'unknown')
    const response = JSON.stringify(trace.response).toLowerCase()
    if (response.includes('je ne peux pas te donner la réponse')) directAnswerRefusals += 1
    if (response.includes('"drift_detected":true')) driftFailures += 1
  }

  return {
    total_traces: traces.data.length,
    sessions: sessions.size,
    notions: [...notions].sort(),
    direct_answer_refusals: directAnswerRefusals,
    drift_failures: driftFailures,
    naivety_proxy_score: traces.data.length > 0 && driftFailures === 0 ? 1 : 0
  }
}

function mapRestTrace(trace: MlflowRestTrace): MlflowTrace {
  return {
    trace_id: trace.trace_id,
    state: trace.state,
    request_time: trace.request_time,
    execution_duration: parseDurationMs(trace.execution_duration),
    request: parseJsonPreview(trace.request_preview),
    response: parseJsonPreview(trace.response_preview),
    metadata: trace.trace_metadata ?? {},
    tags: trace.tags ?? {},
    assessments: trace.assessments ?? [],
    span_count: parseSpanCount(trace.trace_metadata)
  }
}

function parseJsonPreview(value: string | undefined) {
  if (!value) return undefined
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function parseDurationMs(value: string) {
  const seconds = value.endsWith('s') ? Number(value.slice(0, -1)) : Number(value)
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0
}

function parseSpanCount(metadata: Record<string, string> | undefined) {
  const stats = metadata?.['mlflow.trace.sizeStats']
  if (!stats) return 0
  try {
    const parsed = JSON.parse(stats) as { num_spans?: number }
    return parsed.num_spans ?? 0
  } catch {
    return 0
  }
}

export function formatDate(value: number | string | undefined) {
  if (!value) return '—'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}

export function shortId(value: string, size = 10) {
  return `${value.slice(0, size)}…${value.slice(-4)}`
}

export function metricValue(run: MlflowRun, key: string) {
  return run.data.metrics?.find((metric) => metric.key === key)?.value
}

export function paramValue(run: MlflowRun, key: string) {
  return run.data.params?.find((param) => param.key === key)?.value
}
