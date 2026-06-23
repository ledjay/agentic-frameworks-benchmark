import Link from 'next/link'
import { formatDate, getExperimentByName, metricValue, paramValue, searchRuns } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

export default async function EvalsPage() {
  const experiment = await getExperimentByName()
  const runs = experiment ? await searchRuns([experiment.experiment_id]) : { runs: [] }
  const orderedRuns = [...(runs.runs ?? [])].sort((a, b) => (b.info.start_time ?? 0) - (a.info.start_time ?? 0))

  return (
    <main className="shell">
      <nav className="topNav"><Link href="/">← Dashboard</Link><Link href="/research">Impact →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Evaluation runs</p>
        <h1>Suivre les scores de non-régression.</h1>
        <p className="heroText">Cette page lit les runs MLflow. Le run `eval_traces.py` montre une évaluation trace-based avec scorer custom.</p>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>Runs</h2><span>{orderedRuns.length} run(s)</span></div>
        <div className="stack">
          {orderedRuns.map((run) => {
            const score = metricValue(run, 'no_expert_answer/mean') ?? metricValue(run, 'naivety_contract_score')
            return (
              <div className="traceRow" key={run.info.run_id}>
                <div>
                  <strong>{run.info.run_name ?? run.info.run_id}</strong>
                  <p className="muted">{formatDate(run.info.start_time)} · {run.info.status}</p>
                  <div className="pills">
                    {paramValue(run, 'agent_id') ? <span className="pill">{paramValue(run, 'agent_id')}</span> : null}
                    {paramValue(run, 'agent_version') ? <span className="pill">{paramValue(run, 'agent_version')}</span> : null}
                  </div>
                </div>
                <div className="metricBox"><strong>{score === undefined ? '—' : score.toFixed(2)}</strong><span className="muted">score</span></div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
