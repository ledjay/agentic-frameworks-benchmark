import type { RuntimeResult, TurnRequest } from '@/contract/types'
import { runFakeRuntime } from './fake'
import { runLangGraphRuntime, runLangGraphTypeScriptRuntime, runMastraRuntime } from './http-runtimes'

export async function runSelectedRuntime(request: TurnRequest): Promise<RuntimeResult> {
  if (request.runtime === 'fake') return runFakeRuntime(request)
  if (request.runtime === 'mastra') return runMastraRuntime(request)
  if (request.runtime === 'langgraph-python') return runLangGraphRuntime(request)
  if (request.runtime === 'langgraph-typescript') return runLangGraphTypeScriptRuntime(request)
  return runFakeRuntime(request)
}
