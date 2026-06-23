import type { RuntimeResult, TraceResult, TurnRequest } from '@/contract/types'
import { sendLangfuseTrace } from './langfuse'

export async function sendTrace(request: TurnRequest, runtime: RuntimeResult): Promise<TraceResult> {
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
    return {
      provider: 'mlflow',
      status: 'skipped',
      message: 'Adapter MLflow standardisé pas encore câblé : le POC MLflow actuel passe par seed Python @mlflow.trace.'
    }
  }

  if (request.observability === 'phoenix') {
    return {
      provider: 'phoenix',
      status: 'skipped',
      message: 'Adapter Phoenix standardisé pas encore câblé : le POC Phoenix actuel passe par instrumentation OpenInference Python.'
    }
  }

  return { provider: request.observability, status: 'skipped' }
}
