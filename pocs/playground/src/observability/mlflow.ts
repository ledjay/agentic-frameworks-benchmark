import type { RuntimeResult, TraceResult, TurnRequest } from '@/contract/types'

async function postJsonWithTimeout(url: string, payload: unknown, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal
    })
    const text = await response.text()
    const json = text.trim() ? JSON.parse(text) as Record<string, unknown> : {}
    if (!response.ok) throw new Error(`${url} returned ${response.status}: ${text.slice(0, 400)}`)
    return json
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendMlflowTrace(request: TurnRequest, runtime: RuntimeResult): Promise<TraceResult> {
  const url = process.env.MLFLOW_TRACE_BRIDGE_URL ?? 'http://localhost:5011/api/playground-trace'
  const result = await postJsonWithTimeout(url, { request, runtime }, 10_000)
  return {
    provider: 'mlflow',
    status: result.status === 'sent' ? 'sent' : 'error',
    traceId: typeof result.traceId === 'string' ? result.traceId : runtime.runId,
    url: typeof result.url === 'string' ? result.url : (process.env.MLFLOW_BASE_URL ?? 'http://localhost:5001'),
    raw: result
  }
}
