import { NextResponse } from 'next/server'
import { assessmentRequestSchema } from '@/contract/types'

export const runtime = 'nodejs'

function langGraphPythonBaseUrl(observability: string): string {
  if (observability === 'mlflow') return process.env.LANGGRAPH_PY_MLFLOW_API_URL ?? 'http://localhost:3021'
  if (observability === 'phoenix') return process.env.LANGGRAPH_PY_PHOENIX_API_URL ?? 'http://localhost:3022'
  if (observability === 'langfuse') return process.env.LANGGRAPH_PY_LANGFUSE_API_URL ?? 'http://localhost:3023'
  return process.env.LANGGRAPH_API_URL ?? 'http://localhost:3010'
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  })
  const text = await response.text()
  const json = text.trim() ? JSON.parse(text) as Record<string, unknown> : null
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${text.slice(0, 400)}`)
  return json
}

export async function POST(request: Request) {
  const started = Date.now()
  const body = await request.json()
  const parsed = assessmentRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const runtimeStart = Date.now()
    const base = langGraphPythonBaseUrl(parsed.data.observability)
    const runtimeResult = await postJson(`${base}/api/agent/assess`, {
      mode: parsed.data.mode === 'real' ? 'langgraph' : 'mock',
      sessionId: parsed.data.sessionId,
      userId: parsed.data.userId,
      transcript: parsed.data.transcript
    })
    const runtimeMs = Date.now() - runtimeStart
    const trace = runtimeResult?.observability && typeof runtimeResult.observability === 'object'
      ? runtimeResult.observability
      : { provider: parsed.data.observability, status: 'sent' }

    return NextResponse.json({
      request: parsed.data,
      runtime: runtimeResult,
      trace,
      timings: {
        runtimeMs,
        observabilityMs: 0,
        totalMs: Date.now() - started
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      request: parsed.data
    }, { status: 500 })
  }
}
