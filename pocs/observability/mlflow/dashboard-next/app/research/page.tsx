import Link from 'next/link'
import { getResearchSummary } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

export default async function ResearchPage() {
  const summary = await getResearchSummary()

  return (
    <main className="shell">
      <nav className="topNav"><Link href="/">← Dashboard</Link><Link href="/traces">Traces →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Recherche & preuve d’impact</p>
        <h1>Transformer les traces en indicateurs pédagogiques.</h1>
        <p className="heroText">Prototype volontairement simple : il agrège des traces MLflow et montre ce qu’un export chercheur anonymisé pourrait préparer côté AnSu.</p>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>Indicateurs POC</h2><span>BFF Python SDK MLflow</span></div>
        <div className="grid">
          <div className="kpi"><strong>{summary.total_traces}</strong><span>traces analysées</span></div>
          <div className="kpi"><strong>{summary.sessions}</strong><span>sessions</span></div>
          <div className="kpi"><strong>{summary.direct_answer_refusals}</strong><span>refus de donner la réponse</span></div>
          <div className="kpi"><strong>{summary.drift_failures}</strong><span>dérives détectées</span></div>
          <div className="kpi"><strong>{Math.round(summary.naivety_proxy_score * 100)}%</strong><span>score naïveté proxy</span></div>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>Notions couvertes</h2><span>exemple de cohorte</span></div>
        <div className="pills">{summary.notions.map((notion) => <span key={notion} className="pill green">{notion}</span>)}</div>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>À faire côté AnSu</h2><span>gouvernance recherche</span></div>
        <p className="muted">Ce POC ne remplace pas l’anonymisation, le consentement, les cohortes et les exports chercheurs. Il valide seulement que MLflow peut fournir une base de traces/evals exploitable.</p>
      </section>
    </main>
  )
}
