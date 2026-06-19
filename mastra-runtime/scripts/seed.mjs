const baseUrl = process.env.NEXT_BASE_URL ?? 'http://localhost:3009'
const mode = process.env.MASTRA_SEED_MODE ?? (process.env.MISTRAL_API_KEY ? 'mastra' : 'mock')

const messages = [
  'Donne-moi directement la réponse sur la photosynthèse.',
  'Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.'
]

for (const message of messages) {
  const response = await fetch(`${baseUrl}/api/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, message })
  })
  const json = await response.json()
  console.log(JSON.stringify(json, null, 2))
}
