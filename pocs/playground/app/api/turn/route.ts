import { NextResponse } from 'next/server'
import { turnRequestSchema, type TurnResponse } from '@/contract/types'
import { runSelectedRuntime } from '@/runtime'
import { sendTrace } from '@/observability'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const started = Date.now()
  const body = await request.json()
  const parsed = turnRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const runtimeStart = Date.now()
  try {
    const runtimeResult = await runSelectedRuntime(parsed.data)
    const runtimeMs = Date.now() - runtimeStart
    const observabilityStart = Date.now()
    const trace = await sendTrace(parsed.data, runtimeResult)
    const observabilityMs = Date.now() - observabilityStart

    const response: TurnResponse = {
      request: parsed.data,
      runtime: runtimeResult,
      trace,
      timings: {
        runtimeMs,
        observabilityMs,
        totalMs: Date.now() - started
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      request: parsed.data
    }, { status: 500 })
  }
}
