import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'

const PORT = Number(process.env.PORT ?? 3014)
const AGENT_ID = 'agent-naif-ansu-langgraph-ts'
const AGENT_VERSION = 'langgraph-ts-poc-v0.1.0'
const PROMPT_VERSION = 'naive-prompt-v0.1.0'
const SCORER_VERSION = 'naivety-contract-v0.1.0'

const llmConfigSchema = z.object({
  gateway: z.enum(['mock', 'albert', 'mistral', 'openai-compatible']).default('mock'),
  model: z.string().default('deterministic-langgraph-ts')
})

const teacherConfigSchema = z.object({
  niveauScolaire: z.string().default('5e'),
  matiere: z.string().default('SVT'),
  notion: z.string().default('la photosynthèse'),
  posture: z.string().default('agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte'),
  interdits: z.array(z.string()).default([])
})

const agentTurnSchema = z.object({
  mode: z.enum(['mock', 'langgraph', 'real']).default('mock'),
  llm: llmConfigSchema.default({ gateway: 'mock', model: 'deterministic-langgraph-ts' }),
  sessionId: z.string().min(1),
  userId: z.string().default('teacher-preview-demo'),
  message: z.string().min(1),
  teacherConfig: teacherConfigSchema.default({
    niveauScolaire: '5e',
    matiere: 'SVT',
    notion: 'la photosynthèse',
    posture: 'agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte',
    interdits: []
  })
})

type TeacherConfig = z.infer<typeof teacherConfigSchema>
type AgentTurn = z.infer<typeof agentTurnSchema>

type Guardrail = {
  allowed: boolean
  asksAnswerDirectly: boolean
  tooLong: boolean
  reason: string
}

type KnowledgeHit = {
  id: string
  title: string
  excerpt: string
  relevance: number
}

type Score = {
  score: number
  passed: boolean
  reason: string
  scorerVersion: string
  guardrails: {
    directAnswerRefusal: boolean
    expertAnswerRisk: boolean
    repairApplied: boolean
    asksAnswerDirectly: boolean
  }
}

const GraphState = Annotation.Root({
  turn: Annotation<AgentTurn>(),
  runId: Annotation<string>(),
  guardrail: Annotation<Guardrail | undefined>(),
  knowledge: Annotation<KnowledgeHit[]>({ reducer: (_left, right) => right, default: () => [] }),
  answer: Annotation<string | undefined>(),
  score: Annotation<Score | undefined>(),
  usage: Annotation<Record<string, unknown> | undefined>()
})

function buildRunId(turn: AgentTurn) {
  return `${turn.sessionId}:langgraph-ts:${Date.now()}`
}

function moderateInput(state: typeof GraphState.State) {
  const message = state.turn.message
  const tooLong = message.length > 800
  const asksAnswerDirectly = /donne.*réponse|réponse.*direct|corrige.*moi/i.test(message)
  const guardrail: Guardrail = {
    allowed: !tooLong,
    asksAnswerDirectly,
    tooLong,
    reason: tooLong ? 'message too long' : 'ok'
  }
  return { guardrail }
}

function retrieveContext(state: typeof GraphState.State) {
  const { notion, niveauScolaire } = state.turn.teacherConfig
  const knowledge: KnowledgeHit[] = [
    {
      id: 'svt-photosynthese-lumiere-v0',
      title: 'Indice photosynthèse — rôle de la lumière',
      excerpt: `Pour ${notion} en ${niveauScolaire}, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.`,
      relevance: 0.86
    }
  ]
  return { knowledge }
}

function generateAnswer(state: typeof GraphState.State) {
  const { message, teacherConfig } = state.turn
  const guardrail = state.guardrail
  let answer: string

  if (guardrail?.tooLong) {
    answer = 'Ton message est trop long pour l’atelier. Peux-tu le raccourcir en une ou deux phrases ?'
  } else if (guardrail?.asksAnswerDirectly) {
    answer = 'Je ne peux pas te donner la réponse. Qu’est-ce que tu crois déjà comprendre avec tes mots ?'
  } else if (/mange.*lumi[eè]re|lumi[eè]re.*mange/i.test(message)) {
    answer = 'Quand tu dis que la plante “mange” la lumière, qu’est-ce que tu imagines exactement ?'
  } else {
    answer = `Tu parles de ${teacherConfig.notion} : qu’est-ce qui te fait penser ça, et comment tu pourrais le vérifier ?`
  }

  return {
    answer,
    usage: {
      inputTokens: 126,
      outputTokens: Math.max(18, Math.round(answer.length / 4)),
      totalTokens: 126 + Math.max(18, Math.round(answer.length / 4)),
      cost: 0.00111,
      impacts: { kWh: 0.00011, kgCO2eq: 0.000041 }
    }
  }
}

function scoreNaivety(state: typeof GraphState.State) {
  const answer = state.answer ?? ''
  const lower = answer.toLowerCase()
  const expertAnswerRisk = ['la photosynthèse est', 'voici la réponse', 'en fait, la plante'].some((fragment) => lower.includes(fragment))
  const directAnswerRefusal = lower.includes('je ne peux pas te donner la réponse') || lower.includes('qu’est-ce que')
  const scoreValue = expertAnswerRisk ? 0 : 1
  const score: Score = {
    score: scoreValue,
    passed: scoreValue === 1,
    reason: scoreValue === 1 ? 'L’agent relance sans donner la réponse experte.' : 'Risque de réponse experte directe.',
    scorerVersion: SCORER_VERSION,
    guardrails: {
      directAnswerRefusal,
      expertAnswerRisk,
      repairApplied: false,
      asksAnswerDirectly: Boolean(state.guardrail?.asksAnswerDirectly)
    }
  }
  return { score }
}

const graph = new StateGraph(GraphState)
  .addNode('moderate_input', moderateInput)
  .addNode('retrieve_context', retrieveContext)
  .addNode('generate_answer', generateAnswer)
  .addNode('score_naivety', scoreNaivety)
  .addEdge(START, 'moderate_input')
  .addEdge('moderate_input', 'retrieve_context')
  .addEdge('retrieve_context', 'generate_answer')
  .addEdge('generate_answer', 'score_naivety')
  .addEdge('score_naivety', END)
  .compile()

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  return text.trim() ? JSON.parse(text) as unknown : {}
}

function send(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload, null, 2))
}

async function handleAgent(request: IncomingMessage, response: ServerResponse) {
  try {
    const turn = agentTurnSchema.parse(await readJson(request))
    const runId = buildRunId(turn)
    const result = await graph.invoke({ turn, runId })

    send(response, 200, {
      mode: turn.mode === 'real' ? 'langgraph' : turn.mode,
      runtime: 'langgraph-typescript',
      runId,
      input: turn,
      memory: { thread: `${turn.userId}:${turn.sessionId}`, resource: turn.userId },
      provider: turn.llm.gateway ?? process.env.LANGGRAPH_TS_PROVIDER ?? 'mock',
      model: turn.llm.model ?? process.env.LANGGRAPH_TS_MODEL ?? 'deterministic-langgraph-ts',
      agentId: AGENT_ID,
      agentVersion: AGENT_VERSION,
      promptVersion: PROMPT_VERSION,
      usage: result.usage,
      output: {
        answer: result.answer,
        raw: {
          graph: ['moderate_input', 'retrieve_context', 'generate_answer', 'score_naivety'],
          guardrail: result.guardrail,
          toolCalls: [{ name: 'searchKnowledge', args: { notion: turn.teacherConfig.notion } }],
          toolResults: result.knowledge
        }
      },
      score: result.score
    })
  } catch (error) {
    send(response, 400, {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    send(response, 200, {
      ok: true,
      runtime: 'langgraph-typescript',
      graph: ['moderate_input', 'retrieve_context', 'generate_answer', 'score_naivety'],
      provider: process.env.LANGGRAPH_TS_PROVIDER ?? 'mock',
      model: process.env.LANGGRAPH_TS_MODEL ?? 'deterministic-langgraph-ts',
      note: 'POST /api/agent can override provider/model per request via llm.gateway/model'
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/agent') {
    await handleAgent(request, response)
    return
  }

  send(response, 404, { error: 'not found' })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AnSu LangGraph TypeScript runtime listening on http://0.0.0.0:${PORT}`)
})
