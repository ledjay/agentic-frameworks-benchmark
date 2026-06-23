import Link from 'next/link'
import { formatDate, searchTraces, shortId } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

export default async function TracesPage() {
  const traces = await searchTraces()

  return (
    <main className="shell">
      <nav className="topNav"><Link href="/">← Dashboard</Link><Link href="/research">Impact →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Traces MLflow</p>
        <h1>Relire les tours de l’agent naïf.</h1>
        <p className="heroText">Les traces sont récupérées via le BFF Next + SDK MLflow. Pour REST direct, la route utile observée est `/api/3.0/mlflow/traces/search`.</p>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>Dernières traces</h2><span>{traces.data.length} trace(s)</span></div>
        <div className="stack">
          {traces.data.map((trace) => (
            <Link className="traceRow" key={trace.trace_id} href={`/traces/${trace.trace_id}`}>
              <div>
                <strong>{shortId(trace.trace_id, 14)}</strong>
                <p className="muted">{formatDate(trace.request_time)} · {trace.execution_duration} ms · {trace.span_count} spans</p>
                <div className="pills">
                  <span className="pill green">{trace.state}</span>
                  <span className="pill">{trace.metadata['ansu.agent.id'] ?? 'agent'}</span>
                  <span className="pill">{trace.metadata['ansu.sequence.notion'] ?? 'notion'}</span>
                </div>
              </div>
              <code>{trace.metadata['mlflow.trace.session'] ?? 'session inconnue'}</code>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
