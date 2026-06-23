import { NodeSDK } from '@opentelemetry/sdk-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { createTraceId, propagateAttributes, startObservation } from '@langfuse/tracing'
import { LangfuseClient } from '@langfuse/client'
import type { RuntimeResult, TraceResult, TurnRequest } from '@/contract/types'

let sdkStarted = false
let sdk: NodeSDK | undefined
let spanProcessor: LangfuseSpanProcessor | undefined

function ensureSdk() {
  if (sdkStarted && spanProcessor) return spanProcessor
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? 'http://localhost:3012'
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY ?? 'pk-lf-ansu-poc'
  const secretKey = process.env.LANGFUSE_SECRET_KEY ?? 'sk-lf-ansu-poc'
  spanProcessor = new LangfuseSpanProcessor({
    baseUrl,
    publicKey,
    secretKey,
    exportMode: 'immediate',
    timeout: 30,
    shouldExportSpan: ({ otelSpan }) =>
      otelSpan.instrumentationScope.name === 'langfuse-sdk' ||
      ['agent_turn', 'moderation', 'naive_agent_llm', 'searchKnowledge', 'guardrail_score'].includes(otelSpan.name)
  })
  sdk = new NodeSDK({ spanProcessors: [spanProcessor] })
  sdk.start()
  sdkStarted = true
  return spanProcessor
}

export async function sendLangfuseTrace(request: TurnRequest, runtime: RuntimeResult): Promise<TraceResult> {
  const processor = ensureSdk()
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? 'http://localhost:3012'
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY ?? 'pk-lf-ansu-poc'
  const secretKey = process.env.LANGFUSE_SECRET_KEY ?? 'sk-lf-ansu-poc'
  const client = new LangfuseClient({ baseUrl, publicKey, secretKey, timeout: 30 })
  const traceId = await createTraceId(runtime.runId)

  const commonMetadata = {
    runtime: request.runtime,
    runtimeMode: request.mode,
    observability: request.observability,
    runId: runtime.runId,
    llmGateway: request.llm.gateway,
    requestedModel: request.llm.model,
    provider: runtime.provider,
    model: runtime.model,
    agentId: runtime.agentId ?? 'unknown',
    agentVersion: runtime.agentVersion,
    promptVersion: runtime.promptVersion,
    notion: request.teacherConfig.notion,
    matiere: request.teacherConfig.matiere,
    niveauScolaire: request.teacherConfig.niveauScolaire,
    ansuTraceSchema: 'ansu-playground-trace-v0.1.0'
  }

  await propagateAttributes(
    {
      userId: request.userId,
      sessionId: request.sessionId,
      traceName: 'ansu.playground.agent_turn',
      version: runtime.agentVersion,
      tags: ['ansu', 'benchmark-playground', request.runtime, request.observability],
      metadata: commonMetadata
    },
    async () => {
      const root = startObservation(
        'agent_turn',
        {
          input: {
            message: request.message,
            teacherConfig: request.teacherConfig,
            runtime: request.runtime
          },
          metadata: {
            ...commonMetadata,
            usage: JSON.stringify(runtime.usage ?? {}),
            impacts: JSON.stringify(runtime.usage?.impacts ?? {})
          }
        },
        {
          asType: 'span',
          parentSpanContext: { traceId, spanId: '0123456789abcdef', traceFlags: 1 }
        }
      )

      const moderation = root.startObservation('moderation', {
        input: request.message,
        metadata: { ...commonMetadata, source: 'playground-standardized-wrapper' }
      }, { asType: 'span' })
      moderation.update({
        output: {
          allowed: true,
          reason: 'not evaluated in playground MVP',
          runtime: request.runtime
        }
      }).end()

      const generation = root.startObservation(
        'naive_agent_llm',
        {
          model: runtime.model,
          input: [
            { role: 'system', content: request.teacherConfig.posture },
            { role: 'user', content: request.message }
          ],
          metadata: commonMetadata
        },
        { asType: 'generation' }
      )
      generation.update({
        output: { content: runtime.output.answer },
        usageDetails: {
          input: runtime.usage?.inputTokens ?? 0,
          output: runtime.usage?.outputTokens ?? 0,
          total: runtime.usage?.totalTokens ?? 0
        },
        costDetails: runtime.usage?.cost ? { total: runtime.usage.cost } : undefined,
        metadata: { ...commonMetadata, impacts: JSON.stringify(runtime.usage?.impacts ?? {}) }
      }).end()

      const tool = root.startObservation('searchKnowledge', {
        input: { notion: request.teacherConfig.notion, query: `${request.teacherConfig.notion} ${request.teacherConfig.niveauScolaire}` },
        metadata: commonMetadata
      }, { asType: 'tool' })
      tool.update({
        output: runtime.output.raw && typeof runtime.output.raw === 'object'
          ? (runtime.output.raw as Record<string, unknown>).toolResults ?? []
          : []
      }).end()

      const guardrail = root.startObservation('guardrail_score', {
        input: { answer: runtime.output.answer },
        metadata: commonMetadata
      }, { asType: 'span' })
      guardrail.update({ output: runtime.score }).end()

      root.update({
        output: {
          answer: runtime.output.answer,
          score: runtime.score.score,
          passed: runtime.score.passed
        },
        metadata: {
          ...commonMetadata,
          score: String(runtime.score.score),
          scorerVersion: runtime.score.scorerVersion ?? 'unknown'
        }
      }).end()
    }
  )

  client.score.create({
    id: `${traceId}-ansu-naivety`,
    traceId,
    name: 'ansu_naivety',
    value: runtime.score.score,
    dataType: 'NUMERIC',
    comment: runtime.score.reason
  })
  await client.flush()
  await processor.forceFlush()

  return {
    provider: 'langfuse',
    status: 'sent',
    traceId,
    url: `${baseUrl}/project/ansu-langfuse-project/traces/${traceId}`
  }
}
