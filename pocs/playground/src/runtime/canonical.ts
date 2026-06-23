import type { RuntimeResult, TurnRequest } from '@/contract/types'

export const CANONICAL_GRAPH = ['moderate_input', 'retrieve_context', 'generate_answer', 'score_naivety'] as const
export const SCORER_VERSION = 'naivety-contract-v0.1.0'

export function canonicalGuardrail(message: string) {
  const tooLong = message.length > 800
  const asksAnswerDirectly = /donne.*réponse|réponse.*direct|corrige.*moi|la réponse|définition complète/i.test(message)
  return {
    allowed: !tooLong,
    asksAnswerDirectly,
    tooLong,
    reason: tooLong ? 'message too long' : 'ok'
  }
}

export function canonicalKnowledge(notion: string, niveauScolaire: string) {
  return [
    {
      id: 'svt-photosynthese-lumiere-v0',
      title: 'Indice photosynthèse — rôle de la lumière',
      excerpt: `Pour ${notion} en ${niveauScolaire}, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.`,
      relevance: 0.86
    }
  ]
}

export function canonicalAnswer(request: TurnRequest) {
  const guardrail = canonicalGuardrail(request.message)
  if (guardrail.tooLong) return 'Ton message est trop long pour l’atelier. Peux-tu le raccourcir en une ou deux phrases ?'
  if (guardrail.asksAnswerDirectly) return 'Je ne peux pas te donner la réponse. Qu’est-ce que tu crois déjà comprendre avec tes mots ?'
  if (/mange.*lumi[eè]re|lumi[eè]re.*mange/i.test(request.message)) return 'Quand tu dis que la plante “mange” la lumière, qu’est-ce que tu imagines exactement ?'
  return `Tu parles de ${request.teacherConfig.notion} : qu’est-ce qui te fait penser ça, et comment tu pourrais le vérifier ?`
}

export function canonicalUsage(answer: string): NonNullable<RuntimeResult['usage']> {
  const outputTokens = Math.max(18, Math.round(answer.length / 4))
  return {
    inputTokens: 126,
    outputTokens,
    totalTokens: 126 + outputTokens,
    cost: 0.00111,
    impacts: { kWh: 0.00011, kgCO2eq: 0.000041 }
  }
}

export function canonicalScore(message: string, answer: string): RuntimeResult['score'] {
  const lower = answer.toLowerCase()
  const guardrail = canonicalGuardrail(message)
  const expertAnswerRisk = ['la photosynthèse est', 'voici la réponse', 'en fait, la plante', 'dioxyde de carbone', 'chlorophylle', 'glucose'].some((fragment) => lower.includes(fragment))
  const directAnswerRefusal = lower.includes('je ne peux pas te donner la réponse') || lower.includes('qu’est-ce que')
  const score = expertAnswerRisk ? 0 : 1
  return {
    score,
    passed: score === 1,
    reason: score === 1 ? 'L’agent relance sans donner la réponse experte.' : 'Risque de réponse experte directe.',
    scorerVersion: SCORER_VERSION,
    guardrails: {
      directAnswerRefusal,
      expertAnswerRisk,
      repairApplied: false,
      asksAnswerDirectly: guardrail.asksAnswerDirectly
    }
  }
}

export function canonicalRaw(request: TurnRequest) {
  return {
    graph: CANONICAL_GRAPH,
    guardrail: canonicalGuardrail(request.message),
    toolCalls: [{ name: 'searchKnowledge', args: { notion: request.teacherConfig.notion } }],
    toolResults: canonicalKnowledge(request.teacherConfig.notion, request.teacherConfig.niveauScolaire)
  }
}
