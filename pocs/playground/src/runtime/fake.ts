import type { RuntimeResult, TurnRequest } from '@/contract/types'
import { canonicalAnswer, canonicalRaw, canonicalScore, canonicalUsage } from './canonical'

export async function runFakeRuntime(request: TurnRequest): Promise<RuntimeResult> {
  const answer = canonicalAnswer(request)

  return {
    runtime: 'fake',
    mode: 'mock',
    runId: `${request.sessionId}:fake:${Date.now()}`,
    provider: request.llm.gateway,
    model: request.llm.model,
    agentId: 'agent-naif-fake',
    agentVersion: 'fake-v0.1.0',
    promptVersion: 'naive-prompt-v0.1.0',
    output: { answer, raw: canonicalRaw(request) },
    score: canonicalScore(request.message, answer),
    usage: canonicalUsage(answer)
  }
}
