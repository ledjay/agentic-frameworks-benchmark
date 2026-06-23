import Link from 'next/link'
import { createDemoDatasetAction, launchMockEvalAction } from '@/lib/eval-actions'
import { formatDateTime, getDatasets, getExperiments } from '@/lib/phoenix'

export default async function EvalsPage() {
  const datasets = await getDatasets()
  const experimentsByDataset = await Promise.all(
    datasets.data.map(async (dataset) => ({ dataset, experiments: await getExperiments(dataset.id) }))
  )

  return (
    <main className="shell wide">
      <nav className="topNav">
        <Link href="/">← Dashboard</Link>
        <Link href="/prompts">Prompts →</Link>
        <Link href="/criteria">Critères →</Link>
      </nav>

      <section className="projectHero">
        <div>
          <p className="eyebrow">Evaluation runs</p>
          <h1>Lancer une campagne d’eval depuis Next, inspecter dans Phoenix.</h1>
          <p className="heroText small">POC : création dataset, experiment, mock run et score. En prod, ce bouton déclencherait un worker/queue AnSu.</p>
        </div>
        <form action={createDemoDatasetAction}>
          <button type="submit">Créer dataset démo</button>
        </form>
      </section>

      <section className="twoCol">
        <article className="panel">
          <div className="panelHeader"><h2>Datasets & experiments</h2><span>{datasets.data.length} dataset(s)</span></div>
          <div className="stackList">
            {experimentsByDataset.map(({ dataset, experiments }) => (
              <div key={dataset.id} className="objectCard">
                <div className="objectHeader">
                  <strong>{dataset.name}</strong>
                  <span>{dataset.example_count} exemple(s)</span>
                </div>
                <p>{dataset.description ?? 'Sans description'}</p>
                <small>Créé le {formatDateTime(dataset.created_at)}</small>
                <div className="versionList">
                  {experiments.data.length === 0 ? <p className="smallMuted">Aucune expérience.</p> : null}
                  {experiments.data.map((experiment) => (
                    <div key={experiment.id} className="miniRow">
                      <span>{experiment.name ?? experiment.id}</span>
                      <code>{experiment.successful_run_count} ok · {experiment.failed_run_count} fail · {experiment.missing_run_count} missing</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel">
          <div className="panelHeader"><h2>Lancer eval mock</h2><span>experiment + run + evaluation</span></div>
          <form action={launchMockEvalAction} className="feedbackForm">
            <label>Dataset
              <select name="datasetId" required>
                <option value="">Choisir un dataset</option>
                {datasets.data.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                ))}
              </select>
            </label>
            <label>Nom expérience<input name="name" defaultValue={`poc-eval-${Date.now()}`} /></label>
            <button type="submit">Lancer l’eval mock</button>
          </form>
          <p className="smallMuted callout">Ce POC prouve l’écriture API. Le vrai runner appellera l’agent, générera des traces, puis poussera les scores Phoenix.</p>
        </aside>
      </section>
    </main>
  )
}
