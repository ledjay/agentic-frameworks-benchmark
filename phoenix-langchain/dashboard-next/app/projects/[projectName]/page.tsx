import Link from 'next/link'
import { durationMs, formatDateTime, getProject, getTraces, shortId } from '@/lib/phoenix'

type PageProps = {
  params: Promise<{ projectName: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectName } = await params
  const decodedProjectName = decodeURIComponent(projectName)
  const [project, traces] = await Promise.all([getProject(decodedProjectName), getTraces(decodedProjectName, 30)])

  const totalTokens = traces.data.reduce((sum, trace) => sum + trace.token_count_total, 0)
  const avgLatency = traces.data.length
    ? Math.round(traces.data.reduce((sum, trace) => sum + durationMs(trace.start_time, trace.end_time), 0) / traces.data.length)
    : 0

  return (
    <main className="shell wide">
      <nav className="topNav">
        <Link href="/">← Tous les projets</Link>
        <a href="http://localhost:6006" target="_blank" rel="noreferrer">Ouvrir Phoenix UI ↗</a>
      </nav>

      <section className="projectHero">
        <div>
          <p className="eyebrow">Projet Phoenix</p>
          <h1>{project.data.name}</h1>
          <p className="heroText small">Lecture REST server-side depuis Next.js. Aucune requête Phoenix directe depuis le navigateur prof.</p>
        </div>
        <div className="kpiStrip">
          <div><strong>{traces.data.length}</strong><span>traces</span></div>
          <div><strong>{avgLatency} ms</strong><span>latence moy.</span></div>
          <div><strong>{totalTokens}</strong><span>tokens</span></div>
        </div>
      </section>

      <section className="panel tracePanel">
        <div className="panelHeader">
          <h2>Dernières réponses agent</h2>
          <span>REST `/v1/projects/:id/traces`</span>
        </div>

        <div className="traceList">
          {traces.data.map((trace) => (
            <Link
              key={trace.id}
              className="traceRow"
              href={`/projects/${encodeURIComponent(decodedProjectName)}/traces/${trace.trace_id}`}
            >
              <div>
                <strong>{shortId(trace.trace_id, 10)}</strong>
                <span>{formatDateTime(trace.start_time)}</span>
              </div>
              <div className="traceMetrics">
                <span>{durationMs(trace.start_time, trace.end_time)} ms</span>
                <span>{trace.token_count_total} tokens</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
