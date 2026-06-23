import Link from 'next/link'
import { formatDate, getTrace, shortId } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ traceId: string }> }

export default async function TraceDetailPage({ params }: PageProps) {
  const { traceId } = await params
  const trace = await getTrace(traceId)

  return (
    <main className="shell">
      <nav className="topNav"><Link href="/traces">← Traces</Link><a href="http://127.0.0.1:5001" target="_blank" rel="noreferrer">MLflow UI ↗</a></nav>
      <section className="hero">
        <p className="eyebrow">Trace · {shortId(trace.trace_id, 16)}</p>
        <h1>Tour agent inspectable côté AnSu.</h1>
        <p className="heroText">{formatDate(trace.request_time)} · {trace.execution_duration} ms · état {trace.state}</p>
        <div className="pills">
          <span className="pill">{trace.metadata['ansu.agent.id']}</span>
          <span className="pill">{trace.metadata['ansu.agent.version']}</span>
          <span className="pill">{trace.metadata['ansu.sequence.niveau_scolaire']}</span>
          <span className="pill">{trace.metadata['ansu.sequence.matiere']}</span>
        </div>
      </section>

      <section className="twoCol">
        <article className="panel">
          <div className="panelHeader"><h2>Vue métier</h2><span>request / response</span></div>
          <h3>Entrée</h3>
          <pre>{JSON.stringify(trace.request, null, 2)}</pre>
          <h3>Sortie</h3>
          <pre>{JSON.stringify(trace.response, null, 2)}</pre>
        </article>
        <aside className="panel">
          <div className="panelHeader"><h2>Métadonnées</h2><span>anonymisation à prévoir</span></div>
          <pre>{JSON.stringify(trace.metadata, null, 2)}</pre>
        </aside>
      </section>

      <section className="panel">
        <div className="panelHeader"><h2>Spans bruts</h2><span>{trace.spans.length} span(s)</span></div>
        <pre>{JSON.stringify(trace.spans, null, 2)}</pre>
      </section>
    </main>
  )
}
