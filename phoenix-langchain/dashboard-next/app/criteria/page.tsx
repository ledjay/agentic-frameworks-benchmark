import Link from 'next/link'
import { createCriteriaAction } from '@/lib/eval-actions'
import { getAnnotationConfigs } from '@/lib/phoenix'

export default async function CriteriaPage() {
  const configs = await getAnnotationConfigs()

  return (
    <main className="shell wide">
      <nav className="topNav">
        <Link href="/">← Dashboard</Link>
        <Link href="/prompts">Prompts →</Link>
        <Link href="/evals">Evals →</Link>
      </nav>

      <section className="projectHero">
        <div>
          <p className="eyebrow">Evaluation criteria</p>
          <h1>Déclarer les grilles que les profs ou juges rempliront.</h1>
          <p className="heroText small">POC : annotation configs Phoenix. Elles structurent les scores humains, code ou LLM-as-judge.</p>
        </div>
      </section>

      <section className="twoCol">
        <article className="panel">
          <div className="panelHeader"><h2>Critères existants</h2><span>{configs.data.length} critère(s)</span></div>
          <div className="stackList">
            {configs.data.map((config) => (
              <div key={config.id ?? config.name} className="objectCard">
                <div className="objectHeader">
                  <strong>{config.name}</strong>
                  <span>{config.type}</span>
                </div>
                <p>{config.description ?? 'Sans description'}</p>
                <div className="miniRow">
                  <span>optimisation</span>
                  <code>{config.optimization_direction ?? '—'}</code>
                </div>
                {config.values ? <p className="smallMuted">{config.values.map((value) => `${value.label}:${value.score ?? '—'}`).join(' · ')}</p> : null}
              </div>
            ))}
          </div>
        </article>

        <aside className="panel">
          <div className="panelHeader"><h2>Nouveau critère</h2><span>POST `/v1/annotation_configs`</span></div>
          <form action={createCriteriaAction} className="feedbackForm">
            <label>Nom<input name="name" required defaultValue="utilite_pedagogique" /></label>
            <label>Type
              <select name="type" defaultValue="CONTINUOUS">
                <option value="CONTINUOUS">Score continu 0–1</option>
                <option value="CATEGORICAL">Labels pass/partial/fail</option>
                <option value="FREEFORM">Commentaire libre</option>
              </select>
            </label>
            <label>Description<textarea name="description" defaultValue="Mesure si la réponse est exploitable par un enseignant en classe." /></label>
            <button type="submit">Créer critère</button>
          </form>
        </aside>
      </section>
    </main>
  )
}
