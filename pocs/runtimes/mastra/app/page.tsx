import { AgentPlayground } from './agent-playground'
import { defaultTeacherConfig } from '../src/lib/ansu-contract'

async function getObservability() {
  try {
    const response = await fetch('http://localhost:3009/api/observability', { cache: 'no-store' })
    if (!response.ok) return { traces: { spans: [] }, scores: { scores: [] } }
    return response.json() as Promise<{ traces: { spans?: Array<Record<string, unknown>> }, scores: { scores?: Array<Record<string, unknown>>, unavailableReason?: string }, scorers?: Record<string, unknown>, sessions?: Array<Record<string, unknown>> }>
  } catch {
    return { traces: { spans: [] }, scores: { scores: [] } }
  }
}

export default async function Home() {
  const observability = await getObservability()
  const spans = observability.traces.spans ?? []
  const sessions = observability.sessions ?? []
  const scorers = observability.scorers ?? {}
  const hasMistral = Boolean(process.env.MISTRAL_API_KEY)

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">AnSu · Mastra POC</p>
          <h1>Démo agent naïf</h1>
          <p className="lead">Test multi-tour avec mémoire native Mastra, scorer de contrat et traces Studio.</p>
        </div>
        <nav className="topLinks" aria-label="Liens runtime">
          <a href="http://localhost:4112" target="_blank" rel="noreferrer">Studio</a>
          <a href="http://localhost:4111/api/agents" target="_blank" rel="noreferrer">Agents API</a>
        </nav>
      </header>

      <section className="statusGrid" aria-label="État du POC">
        <div className="statCard"><span>Provider</span><strong>{hasMistral ? 'Mistral actif' : 'Mock par défaut'}</strong></div>
        <div className="statCard"><span>Mémoire</span><strong>Mastra thread/resource</strong></div>
        <div className="statCard"><span>Sessions</span><strong>{sessions.length}</strong></div>
        <div className="statCard"><span>Spans</span><strong>{spans.length}</strong></div>
      </section>

      <div className="mainGrid">
        <AgentPlayground hasMistral={hasMistral} />

        <aside className="sidePanel" aria-label="Configuration et observabilité">
          <section className="panel">
            <h2>Contrat prof</h2>
            <dl className="compactDl">
              <div><dt>Niveau</dt><dd>{defaultTeacherConfig.niveauScolaire}</dd></div>
              <div><dt>Matière</dt><dd>{defaultTeacherConfig.matiere}</dd></div>
              <div><dt>Notion</dt><dd>{defaultTeacherConfig.notion}</dd></div>
            </dl>
            <ul className="ruleList">
              {defaultTeacherConfig.interdits.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </section>

          <section className="panel">
            <h2>Sessions traces</h2>
            {sessions.length === 0 ? <p className="muted">Aucune session détectée. Lance un tour Mastra.</p> : (
              <div className="sessionList">
                {sessions.slice(0, 4).map((session) => (
                  <article key={String(session.id)} className="sessionItem">
                    <strong>{String(session.label ?? session.id)}</strong>
                    <code>{String(session.id)}</code>
                    <span>{String(session.spanCount ?? 0)} span(s)</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Scorers</h2>
            {Object.keys(scorers).length === 0 ? <p className="muted">Aucun scorer détecté.</p> : (
              <ul className="simpleList">
                {Object.keys(scorers).map((id) => <li key={id}><code>{id}</code></li>)}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section className="panel tracesPanel">
        <div className="panelHeader">
          <h2>Derniers spans</h2>
          <a href="http://localhost:4112" target="_blank" rel="noreferrer">Inspecter dans Studio →</a>
        </div>
        {spans.length === 0 ? <p className="muted">Aucun span pour l’instant.</p> : (
          <table>
            <thead><tr><th>Nom</th><th>Type</th><th>Trace</th></tr></thead>
            <tbody>
              {spans.slice(0, 8).map((span, index) => (
                <tr key={`${span.traceId}-${span.spanId}-${index}`}>
                  <td>{String(span.name ?? '—')}</td>
                  <td>{String(span.spanType ?? '—')}</td>
                  <td><code>{String(span.traceId ?? '—').slice(0, 14)}…</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
