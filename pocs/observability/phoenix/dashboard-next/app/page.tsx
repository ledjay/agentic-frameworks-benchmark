import Link from 'next/link'
import { getProjects } from '@/lib/phoenix'

export default async function HomePage() {
  const projects = await getProjects()
  const defaultProject = process.env.DEFAULT_PHOENIX_PROJECT ?? 'ansu-phoenix-langchain-demo'

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AnSu · Phoenix integration proof</p>
        <h1>Dashboard profs, données Phoenix, UI maîtrisée par nous.</h1>
        <p className="heroText">
          Cette mini-app Next.js lit Phoenix côté serveur et recompose une interface métier.
          Phoenix reste l’atelier d’inspection de la team produit ; les profs ne voient que ce dashboard.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href={`/projects/${encodeURIComponent(defaultProject)}`}>
            Ouvrir le projet démo
          </Link>
          <Link className="secondaryLink" href="/prompts">Prompts</Link>
          <Link className="secondaryLink" href="/criteria">Critères</Link>
          <Link className="secondaryLink" href="/evals">Evals</Link>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>Projets Phoenix disponibles</h2>
          <span>{projects.data.length} projet(s)</span>
        </div>
        <div className="projectGrid">
          {projects.data.map((project) => (
            <Link key={project.id} className="projectCard" href={`/projects/${encodeURIComponent(project.name)}`}>
              <strong>{project.name}</strong>
              <span>{project.description ?? 'Aucune description'}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
