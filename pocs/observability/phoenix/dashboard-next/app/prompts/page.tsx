import Link from 'next/link'
import { createPromptAction } from '@/lib/eval-actions'
import { getPromptVersions, getPrompts } from '@/lib/phoenix'

export default async function PromptsPage() {
  const prompts = await getPrompts()
  const versionsByPrompt = await Promise.all(
    prompts.data.map(async (prompt) => ({ prompt, versions: await getPromptVersions(prompt.name) }))
  )

  return (
    <main className="shell wide">
      <nav className="topNav">
        <Link href="/">← Dashboard</Link>
        <Link href="/criteria">Critères →</Link>
        <Link href="/evals">Evals →</Link>
      </nav>

      <section className="projectHero">
        <div>
          <p className="eyebrow">Prompt management</p>
          <h1>Versionner les consignes agent depuis notre UI.</h1>
          <p className="heroText small">POC : création de prompt chat Phoenix + version + tag. Phoenix garde l’historique inspectable par la team produit.</p>
        </div>
      </section>

      <section className="twoCol">
        <article className="panel">
          <div className="panelHeader"><h2>Prompts Phoenix</h2><span>{prompts.data.length} prompt(s)</span></div>
          <div className="stackList">
            {versionsByPrompt.map(({ prompt, versions }) => (
              <div key={prompt.id} className="objectCard">
                <div className="objectHeader">
                  <strong>{prompt.name}</strong>
                  <span>{versions.data.length} version(s)</span>
                </div>
                <p>{prompt.description ?? 'Sans description'}</p>
                <div className="versionList">
                  {versions.data.map((version) => (
                    <div key={version.id} className="miniRow">
                      <span>{version.model_provider} · {version.model_name}</span>
                      <code>{version.id}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel">
          <div className="panelHeader"><h2>Nouvelle version</h2><span>POST `/v1/prompts`</span></div>
          <form action={createPromptAction} className="feedbackForm">
            <label>Nom<input name="name" required defaultValue="ansu-teacher-agent" /></label>
            <label>Description<input name="description" defaultValue="Prompt agent enseignant AnSu" /></label>
            <label>Provider
              <select name="modelProvider" defaultValue="OPENAI">
                <option value="OPENAI">OPENAI compatible</option>
              </select>
            </label>
            <p className="smallMuted">Note POC : Phoenix trace Mistral via OpenInference, mais son prompt management REST expose ici une liste provider sans Mistral/Albert.</p>
            <label>Modèle<input name="modelName" defaultValue="gpt-4o-mini" /></label>
            <label>Tag<input name="tag" defaultValue="staging" /></label>
            <label>System prompt<textarea name="systemPrompt" required defaultValue="Tu es un assistant AnSu pour enseignants. Réponds en français, cite tes sources, et signale les limites." /></label>
            <label>User template<textarea name="userTemplate" required defaultValue="Question: {{question}}\n\nContexte: {{context}}" /></label>
            <button type="submit">Créer prompt/version</button>
          </form>
        </aside>
      </section>
    </main>
  )
}
