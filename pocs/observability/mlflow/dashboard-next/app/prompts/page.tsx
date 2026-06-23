import Link from 'next/link'
import { searchPrompts } from '@/lib/mlflow'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  const prompts = await searchPrompts()

  return (
    <main className="shell">
      <nav className="topNav"><Link href="/">← Dashboard</Link><Link href="/evals">Evals →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Prompt Registry</p>
        <h1>Prompts master à trous versionnés dans MLflow.</h1>
        <p className="heroText">MLflow supporte les templates string avec variables Mustache-like. Le schema métier des trous reste à porter côté AnSu.</p>
      </section>
      <section className="panel">
        <div className="panelHeader"><h2>Prompts</h2><span>{prompts.data.length} prompt(s)</span></div>
        <div className="grid">
          {prompts.data.map((prompt, index) => (
            <div className="card" key={`${prompt.name}-${index}`}>
              <h2>{prompt.name ?? 'prompt'}</h2>
              <p className="muted">{prompt.description ?? 'Sans description'}</p>
              <pre>{JSON.stringify(prompt.latest ?? prompt, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
