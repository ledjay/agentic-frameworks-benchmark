'use client'

import { FormEvent, useMemo, useState } from 'react'

const runtimes = [
  { id: 'fake', label: 'Fake', note: 'local deterministic' },
  { id: 'mastra', label: 'Mastra', note: 'runtime TS' },
  { id: 'langgraph-python', label: 'LangGraph Py', note: 'FastAPI runtime' },
  { id: 'langgraph-typescript', label: 'LangGraph TS', note: 'LangGraph.js runtime' }
] as const

const observabilities = [
  { id: 'none', label: 'None', note: 'aucune trace' },
  { id: 'langfuse', label: 'Langfuse', note: 'SDK TS / OTel' },
  { id: 'mlflow', label: 'MLflow', note: 'adapter à câbler' },
  { id: 'phoenix', label: 'Phoenix', note: 'adapter à câbler' }
] as const

const llmPresets = [
  { gateway: 'mock', model: 'deterministic-naive-agent', label: 'Mock', note: 'déterministe' },
  { gateway: 'albert', model: 'albert-large', label: 'Albert', note: 'DINUM / cible' },
  { gateway: 'mistral', model: 'mistral-small-latest', label: 'Mistral', note: 'fallback dev' },
  { gateway: 'openai-compatible', model: 'custom-openai-compatible', label: 'Custom', note: 'OpenAI-compatible' }
] as const

type RuntimeId = typeof runtimes[number]['id']
type ObservabilityId = typeof observabilities[number]['id']
type LlmGateway = typeof llmPresets[number]['gateway']
type ApiResponse = {
  request?: unknown
  runtime?: {
    runId: string
    runtime: string
    provider: string
    model: string
    agentVersion: string
    promptVersion: string
    output: { answer: string }
    score: { score: number; reason?: string; passed?: boolean; guardrails?: Record<string, unknown> }
    usage?: {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
      cost?: number
      impacts?: { kWh?: number; kgCO2eq?: number }
    }
  }
  trace?: {
    provider: string
    status: 'sent' | 'skipped' | 'error'
    traceId?: string
    url?: string
    message?: string
  }
  timings?: { runtimeMs: number; observabilityMs: number; totalMs: number }
  error?: unknown
}

const defaultMessage = 'Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.'

export default function Page() {
  const [runtime, setRuntime] = useState<RuntimeId>('fake')
  const [observability, setObservability] = useState<ObservabilityId>('langfuse')
  const [mode, setMode] = useState<'mock' | 'real'>('mock')
  const [llmGateway, setLlmGateway] = useState<LlmGateway>('mock')
  const [llmModel, setLlmModel] = useState('deterministic-naive-agent')
  const [niveauScolaire, setNiveauScolaire] = useState('5e')
  const [matiere, setMatiere] = useState('SVT')
  const [notion, setNotion] = useState('la photosynthèse')
  const [posture, setPosture] = useState('agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte')
  const [interdits, setInterdits] = useState('ne pas donner la définition complète\nne pas produire une correction prête à recopier')
  const [sessionId, setSessionId] = useState('preview-session-playground')
  const [userId, setUserId] = useState('teacher-preview-demo')
  const [message, setMessage] = useState(defaultMessage)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)

  const payload = useMemo(() => ({
    runtime,
    observability,
    mode,
    llm: { gateway: llmGateway, model: llmModel },
    sessionId,
    userId,
    message,
    teacherConfig: {
      niveauScolaire,
      matiere,
      notion,
      posture,
      interdits: interdits.split('\n').map((line) => line.trim()).filter(Boolean)
    }
  }), [runtime, observability, mode, llmGateway, llmModel, sessionId, userId, message, niveauScolaire, matiere, notion, posture, interdits])

  function selectLlmPreset(preset: typeof llmPresets[number]) {
    setLlmGateway(preset.gateway)
    setLlmModel(preset.model)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json() as ApiResponse
      setResponse(json)
    } catch (error) {
      setResponse({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">AnSu v2 · benchmark agentique</p>
          <h1>Playground étalon</h1>
          <p className="lead">Un seul front pour comparer les runtimes et les plateformes observability/evals sur le même tour agent.</p>
        </div>
        <div className="status-card">
          <span className="dot" />
          <strong>Contrat commun</strong>
          <small>Runtime → réponse normalisée → trace standardisée</small>
        </div>
      </header>

      <form className="grid" onSubmit={submit}>
        <section className="panel config-panel">
          <div className="panel-title">
            <span>01</span>
            <h2>Configuration</h2>
          </div>

          <fieldset>
            <legend>Runtime</legend>
            <div className="switch-grid">
              {runtimes.map((item) => (
                <button className={runtime === item.id ? 'choice active' : 'choice'} key={item.id} onClick={() => setRuntime(item.id)} type="button">
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Observability / eval</legend>
            <div className="switch-grid">
              {observabilities.map((item) => (
                <button className={observability === item.id ? 'choice active' : 'choice'} key={item.id} onClick={() => setObservability(item.id)} type="button">
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field inline">
            <span>Mode runtime</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as 'mock' | 'real')}>
              <option value="mock">mock / stable</option>
              <option value="real">real / provider</option>
            </select>
          </label>

          <fieldset>
            <legend>LLM gateway / model</legend>
            <div className="switch-grid">
              {llmPresets.map((item) => (
                <button className={llmGateway === item.gateway && llmModel === item.model ? 'choice active' : 'choice'} key={`${item.gateway}:${item.model}`} onClick={() => selectLlmPreset(item)} type="button">
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="two-cols">
            <label className="field"><span>Gateway</span><select value={llmGateway} onChange={(event) => setLlmGateway(event.target.value as LlmGateway)}>
              <option value="mock">mock</option>
              <option value="albert">albert</option>
              <option value="mistral">mistral</option>
              <option value="openai-compatible">openai-compatible</option>
            </select></label>
            <label className="field"><span>Model</span><input value={llmModel} onChange={(event) => setLlmModel(event.target.value)} /></label>
          </div>

          <div className="two-cols">
            <label className="field"><span>Niveau</span><input value={niveauScolaire} onChange={(event) => setNiveauScolaire(event.target.value)} /></label>
            <label className="field"><span>Matière</span><input value={matiere} onChange={(event) => setMatiere(event.target.value)} /></label>
          </div>
          <label className="field"><span>Notion</span><input value={notion} onChange={(event) => setNotion(event.target.value)} /></label>
          <label className="field"><span>Posture</span><textarea rows={3} value={posture} onChange={(event) => setPosture(event.target.value)} /></label>
          <label className="field"><span>Interdits pédagogiques</span><textarea rows={3} value={interdits} onChange={(event) => setInterdits(event.target.value)} /></label>
        </section>

        <section className="panel chat-panel">
          <div className="panel-title">
            <span>02</span>
            <h2>Tour élève</h2>
          </div>

          <div className="two-cols">
            <label className="field"><span>Session</span><input value={sessionId} onChange={(event) => setSessionId(event.target.value)} /></label>
            <label className="field"><span>User</span><input value={userId} onChange={(event) => setUserId(event.target.value)} /></label>
          </div>

          <label className="field message-field">
            <span>Message élève</span>
            <textarea rows={7} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>

          <button className="run-button" disabled={loading} type="submit">
            {loading ? 'Exécution…' : 'Lancer le tour agent'}
          </button>

          <article className="answer-card">
            <p className="card-label">Réponse agent</p>
            {response?.runtime ? <p>{response.runtime.output.answer}</p> : <p className="muted">Aucun tour lancé.</p>}
          </article>
        </section>

        <section className="panel debug-panel">
          <div className="panel-title">
            <span>03</span>
            <h2>Trace & debug</h2>
          </div>

          <div className="metric-row">
            <Metric label="Score naïveté" value={response?.runtime?.score.score ?? '—'} />
            <Metric label="Runtime" value={response?.timings ? `${response.timings.runtimeMs} ms` : '—'} />
            <Metric label="Trace" value={response?.trace?.status ?? '—'} />
          </div>

          <div className="trace-card">
            <p className="card-label">Plateforme</p>
            <strong>{response?.trace?.provider ?? observability}</strong>
            {response?.trace?.traceId && <code>{response.trace.traceId}</code>}
            {response?.trace?.url && <a href={response.trace.url} target="_blank" rel="noreferrer">Ouvrir la trace ↗</a>}
            {response?.trace?.message && <p className="muted">{response.trace.message}</p>}
          </div>

          <details open>
            <summary>Payload</summary>
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </details>
          <details>
            <summary>Réponse brute</summary>
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </details>
        </section>
      </form>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}
