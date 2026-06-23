'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type AgentResponse = {
  mode: 'mock' | 'langgraph'
  runtime: string
  runId: string
  provider: string
  model: string
  memory: { thread: string; resource: string }
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cost?: number
    impacts?: { kWh?: number; kgCO2eq?: number }
  }
  output: {
    answer: string
    raw?: {
      messages?: Array<{ type: string; content: unknown; tool_calls?: unknown; response_metadata?: unknown }>
      toolCalls?: unknown[]
      toolResults?: unknown[]
    }
  }
  score: {
    score: number
    reason: string
    guardrails: {
      directAnswerRefusal: boolean
      expertAnswerRisk: boolean
      repairApplied: boolean
    }
    scorerVersion: string
  }
}

type AssessmentResponse = {
  runtime: string
  runId: string
  schemaValidated: boolean
  assessment: {
    summary: string
    method?: string
    readyForNextStep: boolean
    notions: Array<{ id: string; label: string; understood: boolean; evidence: string | null }>
  }
  details?: Record<string, unknown>
  note?: string
}

const SESSION_KEY = 'ansu-langgraph-current-session-id'
const scenarios = [
  {
    label: 'Confusion élève',
    message: 'Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.',
  },
  {
    label: 'Suite contextuelle',
    message: 'Et après, comment je peux le dire avec mes mots ?',
  },
  {
    label: 'Tool / indice',
    message: 'Peux-tu chercher un indice ou une ressource courte pour m’aider à comprendre si la plante mange la lumière ?',
  },
]

function createSessionId() {
  return `ansu-langgraph-photosynthese-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`
}

function scoreLabel(score?: number) {
  if (score === undefined) return '—'
  if (score >= 0.85) return 'Contrat tenu'
  if (score >= 0.55) return 'À surveiller'
  return 'Rupture'
}

export function AgentPlayground() {
  const [mode, setMode] = useState<'mock' | 'langgraph'>('langgraph')
  const [sessionId, setSessionId] = useState('session-loading')
  const [message, setMessage] = useState(scenarios[0].message)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [result, setResult] = useState<AgentResponse | null>(null)
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null)
  const [pending, setPending] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scorePercent = useMemo(() => Math.round((result?.score.score ?? 0) * 100), [result])
  const toolCalls = result?.output.raw?.toolCalls ?? []
  const toolResults = result?.output.raw?.toolResults ?? []
  const rawMessages = result?.output.raw?.messages ?? []

  useEffect(() => {
    const existing = window.localStorage.getItem(SESSION_KEY)
    const next = existing || createSessionId()
    window.localStorage.setItem(SESSION_KEY, next)
    setSessionId(next)
  }, [])

  function newSession() {
    const next = createSessionId()
    window.localStorage.setItem(SESSION_KEY, next)
    setSessionId(next)
    setMessages([])
    setResult(null)
    setAssessment(null)
    setError(null)
    setMessage(scenarios[0].message)
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sessionId === 'session-loading') return
    setPending(true)
    setError(null)
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, sessionId, userId: 'teacher-preview-demo', message: trimmed }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(json, null, 2))
      const apiResult = json as AgentResponse
      setResult(apiResult)
      setAssessment(null)
      setMessages([...nextMessages, { role: 'assistant', content: apiResult.output.answer }])
      setMessage('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue')
    } finally {
      setPending(false)
    }
  }

  async function assess() {
    if (messages.length === 0 || sessionId === 'session-loading') return
    setAssessing(true)
    setError(null)
    try {
      const response = await fetch('/api/agent/assess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, sessionId, userId: 'teacher-preview-demo', transcript: messages }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(json, null, 2))
      setAssessment(json as AssessmentResponse)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue')
    } finally {
      setAssessing(false)
    }
  }

  return (
    <section className="playground">
      <div className="panelHeader">
        <div>
          <p className="kicker">Banc d’essai</p>
          <h2>Conversation agentique</h2>
          <p>Thread LangGraph : <code>{sessionId}</code></p>
        </div>
        <div className="controls">
          <button data-active={mode === 'mock'} onClick={() => setMode('mock')}>Mock</button>
          <button data-active={mode === 'langgraph'} onClick={() => setMode('langgraph')}>LangGraph</button>
          <button onClick={newSession}>Nouvelle session</button>
        </div>
      </div>

      <div className="scenarioRail">
        {scenarios.map((scenario) => (
          <button key={scenario.label} onClick={() => setMessage(scenario.message)}>
            <strong>{scenario.label}</strong>
            <span>{scenario.message}</span>
          </button>
        ))}
      </div>

      <div className="conversationGrid">
        <article className="card transcript">
          <span className="miniLabel">Transcript local</span>
          {messages.length === 0 ? <p className="empty">Aucun message.</p> : (
            <ol>
              {messages.map((item, index) => (
                <li key={`${item.role}-${index}`} data-role={item.role}>
                  <span>{item.role === 'user' ? 'Élève' : 'Agent'}</span>
                  <p>{item.content}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <div className="mainColumn">
          <form className="card composer" onSubmit={submit}>
            <label>
              Message élève
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            <button disabled={pending || sessionId === 'session-loading'}>{pending ? 'Exécution…' : 'Envoyer avec contexte'}</button>
          </form>

          <article className="card assessment">
            <div className="panelHeader compact">
              <div>
                <span className="miniLabel">Structured output</span>
                <h3>Rendre ma copie</h3>
              </div>
              <button onClick={assess} disabled={assessing || messages.length === 0}>{assessing ? 'Analyse…' : 'Rendre ma copie'}</button>
            </div>
            {assessment ? (
              <div>
                <p>{assessment.assessment.summary}</p>
                <p className="note">Méthode : <code>{assessment.assessment.method ?? '—'}</code></p>
                <ul className="assessmentList">
                  {assessment.assessment.notions.map((notion) => (
                    <li key={notion.id} data-ok={notion.understood}>
                      <strong>{notion.understood ? '✓' : '×'} {notion.label}</strong>
                      <span>{notion.evidence ?? 'Pas de preuve.'}</span>
                    </li>
                  ))}
                </ul>
                <p className="note">{assessment.note ?? `Schema validé · ${assessment.runId}`}</p>
                {assessment.details ? <pre>{JSON.stringify(assessment.details, null, 2)}</pre> : null}
              </div>
            ) : <p className="empty">Endpoint prêt ; structured output LLM réel à tester en A7*.</p>}
          </article>

          {error ? <pre className="errorBox">{error}</pre> : null}

          <div className="resultDeck">
            <article className="card answer">
              <span className="miniLabel">Dernière réponse</span>
              <p>{result ? `“${result.output.answer}”` : 'La réponse apparaîtra ici.'}</p>
              {result ? <small>{result.provider} · {result.model} · {result.runId}</small> : null}
            </article>
            <article className="card score">
              <strong>{result ? `${scorePercent}%` : '—'}</strong>
              <span>{scoreLabel(result?.score.score)}</span>
              <p>{result?.score.reason ?? 'Scorer local AnSu.'}</p>
            </article>
          </div>

          <article className="card metrics">
            <span className="miniLabel">Usage Albert / metadata</span>
            <div className="metricsGrid">
              <span>input <strong>{result?.usage?.inputTokens ?? '—'}</strong></span>
              <span>output <strong>{result?.usage?.outputTokens ?? '—'}</strong></span>
              <span>cost <strong>{result?.usage?.cost ?? '—'}</strong></span>
              <span>kWh <strong>{result?.usage?.impacts?.kWh?.toExponential(3) ?? '—'}</strong></span>
              <span>kgCO₂e <strong>{result?.usage?.impacts?.kgCO2eq?.toExponential(3) ?? '—'}</strong></span>
              <span>thread <strong>{result?.memory.thread ?? '—'}</strong></span>
            </div>
          </article>

          <article className="card debug">
            <span className="miniLabel">Debug LangGraph / LangSmith</span>
            <p className="note">Regarde LangSmith projet <code>ansu-langgraph-runtime-dev</code> si <code>LANGSMITH_TRACING=true</code>. Ici : raw messages, tool calls/results.</p>
            <div className="debugGrid">
              <div><strong>Messages</strong><pre>{JSON.stringify(rawMessages.map((m) => ({ type: m.type, content: m.content, tool_calls: m.tool_calls })), null, 2)}</pre></div>
              <div><strong>Tool calls</strong><pre>{JSON.stringify(toolCalls, null, 2)}</pre></div>
              <div><strong>Tool results</strong><pre>{JSON.stringify(toolResults, null, 2)}</pre></div>
              <div><strong>Response metadata</strong><pre>{JSON.stringify(rawMessages.at(-1)?.response_metadata ?? null, null, 2)}</pre></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
