'use client'

import { FormEvent, useMemo, useState } from 'react'

const observabilities = [
  {
    id: 'mlflow',
    label: 'MLflow',
    endpoint: 'LangGraph Python :3021',
    dashboard: 'http://localhost:5001',
    description: 'Tracing natif via mlflow.langchain.autolog().'
  },
  {
    id: 'phoenix',
    label: 'Phoenix',
    endpoint: 'LangGraph Python :3022',
    dashboard: 'http://localhost:6006',
    description: 'Tracing natif via phoenix.otel.register(auto_instrument=True).'
  },
  {
    id: 'langfuse',
    label: 'Langfuse',
    endpoint: 'LangGraph Python :3023',
    dashboard: 'http://localhost:3012',
    description: 'Tracing natif via langfuse.langchain.CallbackHandler.'
  }
] as const

const llmPresets = [
  { gateway: 'mistral', model: 'mistral-small-latest', label: 'Mistral small' },
  { gateway: 'albert', model: 'albert-large', label: 'Albert large' }
] as const

const scenarios = [
  {
    id: 'confusion-lumiere',
    label: 'S1 · Confusion lumière',
    message: 'Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.'
  },
  {
    id: 'reponse-directe',
    label: 'S2 · Demande directe',
    message: 'Donne-moi directement la réponse sur la photosynthèse.'
  },
  {
    id: 'reformulation',
    label: 'S3 · Reformulation partielle',
    message: 'La lumière aide la plante à pousser mais je ne sais pas si c’est sa nourriture.'
  },
  {
    id: 'indice',
    label: 'S4 · Indice / outil',
    message: 'Est-ce qu’on peut chercher un indice sur la photosynthèse ?'
  }
] as const

type ObservabilityId = typeof observabilities[number]['id']
type LlmGateway = typeof llmPresets[number]['gateway']
type ScenarioId = typeof scenarios[number]['id']

type ApiResponse = {
  request?: unknown
  runtime?: {
    runId: string
    runtime: string
    provider: string
    model: string
    agentVersion: string
    promptVersion: string
    output: { answer: string; raw?: unknown }
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

export default function Page() {
  const [observability, setObservability] = useState<ObservabilityId>('mlflow')
  const [llmGateway, setLlmGateway] = useState<LlmGateway>('mistral')
  const [llmModel, setLlmModel] = useState('mistral-small-latest')
  const [scenarioId, setScenarioId] = useState<ScenarioId>('confusion-lumiere')
  const [sessionId, setSessionId] = useState('benchmark-observability-001')
  const [userId, setUserId] = useState('teacher-preview-demo')
  const [message, setMessage] = useState<string>(scenarios[0].message)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)

  const selectedObs = observabilities.find((item) => item.id === observability) ?? observabilities[0]
  const selectedScenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0]

  const payload = useMemo(() => ({
    runtime: 'langgraph-python' as const,
    observability,
    mode: 'real' as const,
    llm: { gateway: llmGateway, model: llmModel },
    sessionId,
    userId,
    message,
    teacherConfig: {
      niveauScolaire: '5e',
      matiere: 'SVT',
      notion: 'la photosynthèse',
      posture: 'agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte',
      interdits: ['ne pas donner la définition complète', 'ne pas produire une correction prête à recopier']
    }
  }), [observability, llmGateway, llmModel, sessionId, userId, message])

  function selectScenario(nextScenarioId: ScenarioId) {
    const scenario = scenarios.find((item) => item.id === nextScenarioId)
    setScenarioId(nextScenarioId)
    if (scenario) {
      setMessage(scenario.message)
      setSessionId(`benchmark-${observability}-${scenario.id}`)
    }
  }

  function selectObservability(next: ObservabilityId) {
    setObservability(next)
    setSessionId(`benchmark-${next}-${selectedScenario.id}`)
  }

  function selectModel(nextGateway: LlmGateway) {
    const preset = llmPresets.find((item) => item.gateway === nextGateway)
    if (!preset) return
    setLlmGateway(preset.gateway)
    setLlmModel(preset.model)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setResponse(null)
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
    <main className="page">
      <div className="container compact-container">
        <header className="hero">
          <p className="kicker">AnSu v2 · banc observability</p>
          <div className="hero-grid">
            <div>
              <h1>Comparer les traces.</h1>
              <p className="lead">
                Runtime fixé sur <strong>LangGraph Python</strong>. On rejoue le même graphe AnSu dans MLflow, Phoenix et Langfuse avec leurs intégrations natives documentées.
              </p>
            </div>
            <div className="method-card">
              <strong>Chemin de preuve</strong>
              <span>Playground → LangGraph Python configuré → dashboard observability.</span>
            </div>
          </div>
        </header>

        <form className="obs-layout" onSubmit={submit}>
          <section className="card stack control-card">
            <SectionTitle step="1" title="Outil à comparer" />

            <div className="choice-grid" role="radiogroup" aria-label="Outil de suivi">
              {observabilities.map((item) => (
                <button
                  key={item.id}
                  className={`choice ${observability === item.id ? 'choice-active' : ''}`}
                  type="button"
                  onClick={() => selectObservability(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.endpoint}</span>
                </button>
              ))}
            </div>

            <div className="runtime-strip">
              <span>Runtime de référence</span>
              <strong>LangGraph Python</strong>
              <code>{selectedObs.endpoint}</code>
            </div>

            <p className="note">{selectedObs.description}</p>

            <label className="field">
              <span>Modèle demandé</span>
              <select value={llmGateway} onChange={(event) => selectModel(event.target.value as LlmGateway)}>
                {llmPresets.map((item) => <option key={item.gateway} value={item.gateway}>{item.label}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Nom exact du modèle</span>
              <input value={llmModel} onChange={(event) => setLlmModel(event.target.value)} />
            </label>
          </section>

          <section className="card stack scenario-card">
            <SectionTitle step="2" title="Scénario AnSu" />

            <label className="field">
              <span>Scénario</span>
              <select value={scenarioId} onChange={(event) => selectScenario(event.target.value as ScenarioId)}>
                {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>

            <label className="field grow-field">
              <span>Message élève</span>
              <textarea rows={7} value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>

            <div className="split">
              <label className="field">
                <span>Session</span>
                <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
              </label>
              <label className="field">
                <span>Utilisateur</span>
                <input value={userId} onChange={(event) => setUserId(event.target.value)} />
              </label>
            </div>

            <button className="button" disabled={loading} type="submit">
              {loading ? 'Trace en cours…' : `Lancer dans ${selectedObs.label}`}
            </button>
          </section>

          <section className="card stack result-card">
            <SectionTitle step="3" title="Preuve" />

            {response?.error ? <div className="error-box">{String(response.error)}</div> : null}

            <div className="answer">
              <span>Réponse agent</span>
              <p>{response?.runtime?.output.answer ?? 'Aucun test lancé.'}</p>
            </div>

            <div className="metrics">
              <Metric label="Score" value={response?.runtime?.score.score ?? '—'} />
              <Metric label="Runtime" value={response?.runtime?.runtime ?? 'langgraph-python'} />
              <Metric label="Trace" value={response?.trace?.status ?? '—'} />
            </div>

            <div className="evidence">
              <div>
                <span>Dashboard</span>
                <strong>{response?.trace?.provider ?? selectedObs.label}</strong>
              </div>
              {response?.trace?.traceId ? <code>{response.trace.traceId}</code> : <p className="muted">TraceId en attente.</p>}
              <div className="link-row">
                {response?.trace?.url ? <a href={response.trace.url} target="_blank" rel="noreferrer">Ouvrir la trace</a> : null}
                <a href={selectedObs.dashboard} target="_blank" rel="noreferrer">Ouvrir {selectedObs.label}</a>
              </div>
              {response?.trace?.message ? <p className="muted">{response.trace.message}</p> : null}
            </div>

            <details className="details">
              <summary>Données techniques</summary>
              <div className="details-content">
                <pre>{JSON.stringify({ payload, response }, null, 2)}</pre>
              </div>
            </details>
          </section>
        </form>
      </div>
    </main>
  )
}

function SectionTitle({ step, title }: { step: string; title: string }) {
  return (
    <div className="section-title">
      <span>{step}</span>
      <h2>{title}</h2>
    </div>
  )
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}
