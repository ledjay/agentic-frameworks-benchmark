import Link from 'next/link'
import { formatDate, getExperimentByName, getResearchSummary, searchRuns, searchTraces } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const experiment = await getExperimentByName()
  const [runs, traces, research] = await Promise.all([
    experiment ? searchRuns([experiment.experiment_id]) : Promise.resolve({ runs: [] }),
    searchTraces(),
    getResearchSummary()
  ])

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AnSu · MLflow investigation UI</p>
        <h1>Une façade Next pour lire MLflow sans exposer son UI aux profs.</h1>
        <p className="heroText">
          Cette interface teste le rôle BFF : Next parle en langage AnSu, puis récupère experiments,
          traces, prompts et evals depuis MLflow côté serveur.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/traces">Explorer les traces</Link>
          <Link className="secondaryLink" href="/prompts">Prompts</Link>
          <Link className="secondaryLink" href="/evals">Evals</Link>
          <Link className="secondaryLink" href="/research">Impact recherche</Link>
          <a className="secondaryLink" href="http://127.0.0.1:5001" target="_blank" rel="noreferrer">MLflow UI ↗</a>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader"><h2>Vue d’ensemble</h2><span>{experiment?.name ?? 'expérience introuvable'}</span></div>
        <div className="grid">
          <div className="kpi"><strong>{traces.data.length}</strong><span>traces agent</span></div>
          <div className="kpi"><strong>{runs.runs?.length ?? 0}</strong><span>runs MLflow</span></div>
          <div className="kpi"><strong>{research.sessions}</strong><span>session(s)</span></div>
          <div className="kpi"><strong>{Math.round(research.naivety_proxy_score * 100)}%</strong><span>score naïveté proxy</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader"><h2>Expérience active</h2><span>REST `/api/2.0/mlflow/experiments/search`</span></div>
        {experiment ? (
          <div className="card">
            <p><strong>{experiment.name}</strong></p>
            <p className="muted">Créée le {formatDate(experiment.creation_time)}</p>
            <p><code>{experiment.artifact_location}</code></p>
          </div>
        ) : <p>Aucune expérience trouvée.</p>}
      </section>
    </main>
  )
}
