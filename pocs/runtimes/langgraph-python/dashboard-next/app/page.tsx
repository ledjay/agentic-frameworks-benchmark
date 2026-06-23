import { AgentPlayground } from './playground'

export const dynamic = 'force-dynamic'

type Health = {
  ok: boolean
  runtime: string
  provider: string
  model: string
  langsmith?: {
    tracing: boolean
    apiKeyPresent: boolean
    project: string
    note: string
  }
}

async function getHealth(): Promise<Health | null> {
  try {
    const baseUrl = process.env.NEXT_BASE_URL ?? 'http://localhost:3011'
    const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export default async function Home() {
  const health = await getHealth()
  return (
    <main>
      <header className="hero">
        <p className="kicker">AnSu v2 · Runtime benchmark</p>
        <h1>LangGraph + LangChain Python</h1>
        <p>
          POC comparable à Mastra : façade API AnSu, mémoire par thread, Albert,
          scorer local, tools mock et LangSmith en debug dev.
        </p>
        <div className="statusGrid">
          <span>Runtime <strong>{health?.runtime ?? '—'}</strong></span>
          <span>Provider <strong>{health?.provider ?? '—'}</strong></span>
          <span>Model <strong>{health?.model ?? '—'}</strong></span>
          <span>
            LangSmith{' '}
            <strong data-ok={health?.langsmith?.tracing ?? false}>
              {health?.langsmith?.tracing ? 'ON' : 'OFF'}
            </strong>
          </span>
        </div>
        <p className="note">
          LangSmith sert seulement à visualiser les traces pendant le développement.
          Projet : <code>{health?.langsmith?.project ?? 'ansu-langgraph-runtime-dev'}</code>
        </p>
      </header>
      <AgentPlayground />
    </main>
  )
}
