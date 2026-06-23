import type { RuntimeResult, TraceResult, TurnRequest } from '@/contract/types'
import { sendLangfuseTrace } from './langfuse'
import { sendMlflowTrace } from './mlflow'
import { sendPhoenixTrace } from './phoenix'

function runtimeNativeTrace(request: TurnRequest, runtime: RuntimeResult): TraceResult | null {
  const raw = runtime.raw
  if (!raw || typeof raw !== 'object') return null
  const observability = (raw as Record<string, unknown>).observability
  if (!observability || typeof observability !== 'object') return null
  const trace = observability as Record<string, unknown>
  if (trace.provider !== request.observability) return null
  return {
    provider: request.observability,
    status: trace.status === 'sent' ? 'sent' : trace.status === 'error' ? 'error' : 'skipped',
    traceId: typeof trace.traceId === 'string' ? trace.traceId : undefined,
    url: typeof trace.url === 'string' ? trace.url : undefined,
    message: typeof trace.message === 'string' ? trace.message : 'Trace produite par le runtime.',
    raw: trace
  }
}

export async function sendTrace(request: TurnRequest, runtime: RuntimeResult): Promise<TraceResult> {
  const nativeTrace = runtimeNativeTrace(request, runtime)
  if (nativeTrace) return nativeTrace

  if (request.observability === 'none') {
    return { provider: 'none', status: 'skipped', message: 'Observability désactivée pour ce tour.' }
  }

  if (request.observability === 'langfuse') {
    return sendLangfuseTrace(request, runtime).catch((error: unknown) => ({
      provider: 'langfuse',
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }))
  }

  if (request.observability === 'mlflow') {
    return sendMlflowTrace(request, runtime).catch((error: unknown) => ({
      provider: 'mlflow',
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }))
  }

  if (request.observability === 'phoenix') {
    return sendPhoenixTrace(request, runtime).catch((error: unknown) => ({
      provider: 'phoenix',
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }))
  }

  return { provider: request.observability, status: 'skipped' }
}
