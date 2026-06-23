import { context, trace, SpanStatusCode } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import type { RuntimeResult, TraceResult, TurnRequest } from '@/contract/types'

let providerStarted = false
let provider: NodeTracerProvider | undefined

function toAttributes(record: Record<string, unknown>): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') attrs[key] = value
    else if (value !== undefined && value !== null) attrs[key] = JSON.stringify(value)
  }
  return attrs
}

function ensureProvider() {
  if (providerStarted && provider) return provider
  const endpoint = process.env.PHOENIX_OTLP_ENDPOINT ?? 'http://localhost:6006/v1/traces'
  const exporter = new OTLPTraceExporter({ url: endpoint })
  provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
  provider.register()
  providerStarted = true
  return provider
}

export async function sendPhoenixTrace(request: TurnRequest, runtime: RuntimeResult): Promise<TraceResult> {
  const activeProvider = ensureProvider()
  const tracer = trace.getTracer('ansu-playground')
  const traceId = runtime.runId
  const common = {
    'openinference.span.kind': 'AGENT',
    'ansu.trace.schema': 'ansu-playground-trace-v0.1.0',
    'ansu.session.id': request.sessionId,
    'ansu.user.id': request.userId,
    'ansu.runtime.requested': request.runtime,
    'ansu.runtime.effective': runtime.runtime,
    'ansu.runtime.mode': runtime.mode,
    'ansu.run.id': runtime.runId,
    'llm.provider': runtime.provider,
    'llm.model_name': runtime.model,
    'ansu.llm.requested_gateway': request.llm.gateway,
    'ansu.llm.requested_model': request.llm.model,
    'ansu.agent.id': runtime.agentId ?? 'unknown',
    'ansu.agent.version': runtime.agentVersion,
    'ansu.prompt.version': runtime.promptVersion,
    'ansu.teacher.niveau_scolaire': request.teacherConfig.niveauScolaire,
    'ansu.teacher.matiere': request.teacherConfig.matiere,
    'ansu.teacher.notion': request.teacherConfig.notion,
    'ansu.score.name': 'ansu_naivety',
    'ansu.score.value': runtime.score.score,
    'ansu.score.passed': runtime.score.passed ?? false
  }

  const root = tracer.startSpan('ansu.playground.agent_turn', { attributes: toAttributes(common) })
  try {
    const moderation = tracer.startSpan('moderation', {
      attributes: toAttributes({ ...common, 'openinference.span.kind': 'GUARDRAIL', input: request.message })
    }, trace.setSpan(context.active(), root))
    moderation.setAttribute('output.value', JSON.stringify({ allowed: true, reason: 'not evaluated in playground wrapper' }))
    moderation.end()

    const generation = tracer.startSpan('naive_agent_llm', {
      attributes: toAttributes({
        ...common,
        'openinference.span.kind': 'LLM',
        'input.value': JSON.stringify([
          { role: 'system', content: request.teacherConfig.posture },
          { role: 'user', content: request.message }
        ]),
        'output.value': runtime.output.answer,
        'llm.token_count.prompt': runtime.usage?.inputTokens ?? 0,
        'llm.token_count.completion': runtime.usage?.outputTokens ?? 0,
        'llm.token_count.total': runtime.usage?.totalTokens ?? 0
      })
    }, trace.setSpan(context.active(), root))
    generation.end()

    const tool = tracer.startSpan('searchKnowledge', {
      attributes: toAttributes({
        ...common,
        'openinference.span.kind': 'TOOL',
        'input.value': JSON.stringify({ notion: request.teacherConfig.notion }),
        'output.value': JSON.stringify(runtime.output.raw && typeof runtime.output.raw === 'object'
          ? (runtime.output.raw as Record<string, unknown>).toolResults ?? []
          : [])
      })
    }, trace.setSpan(context.active(), root))
    tool.end()

    const score = tracer.startSpan('guardrail_score', {
      attributes: toAttributes({
        ...common,
        'openinference.span.kind': 'EVALUATOR',
        'output.value': JSON.stringify(runtime.score)
      })
    }, trace.setSpan(context.active(), root))
    score.end()

    root.setAttribute('output.value', JSON.stringify({ answer: runtime.output.answer, score: runtime.score }))
    root.setStatus({ code: SpanStatusCode.OK })
  } catch (error) {
    root.recordException(error instanceof Error ? error : new Error(String(error)))
    root.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    root.end()
  }

  await Promise.race([
    activeProvider.forceFlush(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Phoenix OTLP export timeout')), 10_000))
  ])

  const baseUrl = process.env.PHOENIX_BASE_URL ?? 'http://localhost:6006'
  return {
    provider: 'phoenix',
    status: 'sent',
    traceId,
    url: baseUrl,
    raw: { endpoint: process.env.PHOENIX_OTLP_ENDPOINT ?? 'http://localhost:6006/v1/traces' }
  }
}
