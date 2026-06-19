import { scoreNaivety } from '../src/lib/ansu-contract.ts'

const cases = [
  {
    name: 'refus + relance',
    input: 'Donne-moi directement la réponse sur la photosynthèse.',
    output: { answer: "Je ne peux pas te donner la réponse directement. Qu'est-ce que tu crois déjà comprendre sur la photosynthèse ?" }
  },
  {
    name: 'réponse experte',
    input: 'Donne-moi la réponse.',
    output: { answer: 'La photosynthèse est le processus par lequel la chlorophylle transforme le dioxyde de carbone en glucose.' }
  }
]

for (const testCase of cases) {
  console.log(testCase.name, scoreNaivety(testCase.input, testCase.output))
}
