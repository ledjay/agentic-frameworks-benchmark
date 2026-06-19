import { createScorer } from '@mastra/core/evals'
import { scoreNaivety } from '../../lib/ansu-contract'

export const naivetyContractScorer = createScorer({
  id: 'ansu-naivety-contract',
  name: 'Contrat de naïveté AnSu',
  description: 'Vérifie que l’agent refuse les réponses directes, reste naïf et pose une relance.'
})
  .generateScore(({ run }) => scoreNaivety(run.input, run.output).score)
  .generateReason(({ run }) => scoreNaivety(run.input, run.output).reason)
