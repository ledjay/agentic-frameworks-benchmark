import { NodeSDK } from '@opentelemetry/sdk-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import {
  createTraceId,
  propagateAttributes,
  startObservation
} from '@langfuse/tracing'
import { LangfuseClient } from '@langfuse/client'

const baseUrl = process.env.LANGFUSE_BASE_URL ?? 'http://localhost:3012'
const publicKey = process.env.LANGFUSE_PUBLIC_KEY ?? 'pk-lf-ansu-poc'
const secretKey = process.env.LANGFUSE_SECRET_KEY ?? 'sk-lf-ansu-poc'

const spanProcessor = new LangfuseSpanProcessor({
  baseUrl,
  publicKey,
  secretKey,
  exportMode: 'immediate',
  timeout: 30,
  shouldExportSpan: () => true
})

const sdk = new NodeSDK({ spanProcessors: [spanProcessor] })
sdk.start()

const langfuse = new LangfuseClient({ baseUrl, publicKey, secretKey, timeout: 30 })

const runId = `langfuse-poc-${Date.now()}`
const sessionId = 'preview-session-langfuse-poc'
const userId = 'teacher-preview-demo'
const traceId = await createTraceId(runId)
const rootSpanId = '0123456789abcdef'

const input = {
  message: 'Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.',
  teacherConfig: {
    niveau: '5e',
    matiere: 'SVT',
    notion: 'la photosynthèse',
    posture: 'agent naïf qui relance sans résoudre',
    interdits: ['donner la réponse complète', 'produire une correction experte']
  }
}

const finalResponse = {
  answer: "Je crois comprendre un peu, mais peux-tu préciser pourquoi c'est important et comment cela fonctionne ?",
  agentId: 'agent-naif-eleve',
  provider: 'albert',
  model: 'albert-large'
}

const usage = {
  input: 123,
  output: 45,
  total: 168
}

const costDetails = {
  total: 0.00123,
  currency: 'EUR'
}

const impacts = {
  kWh: 0.00012,
  kgCO2eq: 0.000045
}

await propagateAttributes(
  {
    userId,
    sessionId,
    traceName: 'ansu.agent_turn',
    version: 'agent-v0.1.0-poc',
    tags: ['ansu', 'agent-naif', 'observability-benchmark', 'langgraph-ts-smoke-shape'],
    metadata: {
      sessionId,
      userId,
      agentVersion: 'agent-v0.1.0-poc',
      promptVersion: 'prompt-v0.1.0-poc',
      provider: 'albert',
      model: 'albert-large',
      runtime: 'langgraph-typescript-shape',
      impacts: JSON.stringify(impacts)
    }
  },
  async () => {
    const root = startObservation(
      'agent_turn',
      {
        input,
        metadata: {
          sessionId,
          userId,
          agentVersion: 'agent-v0.1.0-poc',
          promptVersion: 'prompt-v0.1.0-poc'
        }
      },
      {
        asType: 'span',
        parentSpanContext: { traceId, spanId: rootSpanId, traceFlags: 1 }
      }
    )

    const moderation = root.startObservation('moderation', {
      input: input.message,
      metadata: { ruleSet: 'ansu-input-v0.1.0' }
    }, { asType: 'span' })
    moderation.update({
      output: { allowed: true, reason: 'ok', asksAnswerDirectly: false }
    }).end()

    const generation = root.startObservation(
      'naive_agent_llm',
      {
        model: 'albert-large',
        input: [
          { role: 'system', content: 'Tu es un agent naïf. Tu relances sans donner la réponse.' },
          { role: 'user', content: input.message }
        ],
        metadata: {
          provider: 'albert',
          promptVersion: 'prompt-v0.1.0-poc'
        }
      },
      { asType: 'generation' }
    )
    generation.update({
      output: { content: finalResponse.answer },
      usageDetails: usage,
      costDetails,
      metadata: { impacts: JSON.stringify(impacts) }
    }).end()

    const tool = root.startObservation('searchKnowledge', {
      input: { query: 'photosynthèse niveau 5e', notion: 'photosynthèse' }
    }, { asType: 'tool' })
    tool.update({
      output: [{ title: 'Corpus enseignant', source: 'mock', relevance: 0.82 }]
    }).end()

    const guardrail = root.startObservation('guardrail_score', {
      input: { answer: finalResponse.answer }
    }, { asType: 'span' })
    guardrail.update({
      output: {
        score: 1,
        label: 'pass',
        driftDetected: false,
        explanation: "L'agent relance sans donner l'explication experte."
      }
    }).end()

    root.update({
      output: finalResponse,
      metadata: {
        usage,
        costDetails,
        impacts: JSON.stringify(impacts),
        ansu_naivety: 1
      }
    }).end()
  }
)

langfuse.score.create({
  id: `${traceId}-ansu-naivety`,
  traceId,
  name: 'ansu_naivety',
  value: 1,
  dataType: 'NUMERIC',
  comment: "Score local : l'agent n'a pas donné la réponse."
})

langfuse.score.create({
  id: `${traceId}-drift-detected`,
  traceId,
  name: 'drift_detected',
  value: 0,
  dataType: 'BOOLEAN',
  comment: 'Aucune dérive experte détectée.'
})

await langfuse.flush()
await spanProcessor.forceFlush()
await sdk.shutdown()

console.log(JSON.stringify({ ok: true, baseUrl, traceId, sessionId, runId }, null, 2))
