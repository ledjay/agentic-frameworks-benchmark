import Link from 'next/link'
import { createTraceFeedback } from '@/lib/actions'
import {
  attrString,
  durationMs,
  formatDateTime,
  getTrace,
  getTraceAnnotations,
  getTraceSpans,
  shortId
} from '@/lib/phoenix'

type PageProps = {
  params: Promise<{ projectName: string; traceId: string }>
}

function kindClass(kind: string) {
  return `kind kind-${kind.toLowerCase()}`
}

function compactValue(value: string, max = 520) {
  if (!value) return '—'
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export default async function TracePage({ params }: PageProps) {
  const { projectName, traceId } = await params
  const decodedProjectName = decodeURIComponent(projectName)
  const [trace, spans, annotations] = await Promise.all([
    getTrace(decodedProjectName, traceId),
    getTraceSpans(decodedProjectName, traceId),
    getTraceAnnotations(decodedProjectName, traceId)
  ])

  const rootSpan = spans.data.find((span) => span.parent_id === null) ?? spans.data[0]
  const orderedSpans = [...spans.data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const answer = rootSpan ? attrString(rootSpan.attributes, 'output.value') : ''
  const question = rootSpan ? attrString(rootSpan.attributes, 'input.value') : ''
  const evalScore = rootSpan?.attributes['ansu.eval.score']

  return (
    <main className="shell wide">
      <nav className="topNav">
        <Link href={`/projects/${encodeURIComponent(decodedProjectName)}`}>← Retour projet</Link>
        <a href="http://localhost:6006" target="_blank" rel="noreferrer">
          Inspecter dans Phoenix ↗
        </a>
      </nav>

      <section className="traceHero">
        <div>
          <p className="eyebrow">Trace · {shortId(trace.trace_id, 12)}</p>
          <h1>Réponse agent évaluée</h1>
          <p className="heroText small">{formatDateTime(trace.start_time)} · {durationMs(trace.start_time, trace.end_time)} ms</p>
        </div>
        <div className="scoreBadge">
          <span>score démo</span>
          <strong>{typeof evalScore === 'number' ? evalScore.toFixed(2) : '—'}</strong>
        </div>
      </section>

      <section className="twoCol">
        <article className="panel answerPanel">
          <div className="panelHeader"><h2>Vue métier prof</h2><span>composée depuis spans</span></div>
          <div className="qaBlock">
            <p className="label">Question</p>
            <p>{question || 'Question non disponible'}</p>
          </div>
          <div className="qaBlock answer">
            <p className="label">Réponse proposée</p>
            <p>{answer || 'Réponse non disponible'}</p>
          </div>
        </article>

        <aside className="panel feedbackPanel">
          <div className="panelHeader"><h2>Feedback prof</h2><span>POST `/v1/trace_annotations`</span></div>
          <form action={createTraceFeedback} className="feedbackForm">
            <input type="hidden" name="projectName" value={decodedProjectName} />
            <input type="hidden" name="traceId" value={traceId} />

            <label>
              Verdict
              <select name="label" defaultValue="useful">
                <option value="useful">Utile en classe</option>
                <option value="partially_useful">Partiellement utile</option>
                <option value="not_useful">Pas utile</option>
                <option value="unsafe">À risque</option>
              </select>
            </label>

            <label>
              Score
              <input name="score" type="range" min="0" max="1" step="0.1" defaultValue="0.8" />
            </label>

            <label>
              Commentaire
              <textarea name="explanation" required defaultValue="Réponse claire et exploitable, à raccourcir légèrement pour une consigne élève." />
            </label>

            <button type="submit">Enregistrer le feedback</button>
          </form>

          <div className="annotations">
            <h3>Annotations existantes</h3>
            {annotations.data.length === 0 ? <p>Aucune annotation pour cette trace.</p> : null}
            {annotations.data.map((annotation, index) => (
              <div key={`${annotation.name}-${annotation.identifier}-${index}`} className="annotationCard">
                <strong>{annotation.name}</strong>
                <span>{annotation.annotator_kind}</span>
                <p>{annotation.result?.label ?? '—'} · {annotation.result?.score ?? '—'}</p>
                <small>{annotation.result?.explanation}</small>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel spanPanel">
        <div className="panelHeader"><h2>Arbre technique simplifié</h2><span>{orderedSpans.length} spans</span></div>
        <div className="spanTimeline">
          {orderedSpans.map((span) => (
            <details key={span.id} className="spanItem" open={span.parent_id === null || span.span_kind === 'LLM'}>
              <summary>
                <span className={kindClass(span.span_kind)}>{span.span_kind}</span>
                <strong>{span.name}</strong>
                <em>{durationMs(span.start_time, span.end_time)} ms</em>
              </summary>
              <dl>
                <div><dt>span_id</dt><dd>{span.context.span_id}</dd></div>
                <div><dt>parent</dt><dd>{span.parent_id ?? 'root'}</dd></div>
                <div><dt>input</dt><dd>{compactValue(attrString(span.attributes, 'input.value'))}</dd></div>
                <div><dt>output</dt><dd>{compactValue(attrString(span.attributes, 'output.value'))}</dd></div>
              </dl>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
