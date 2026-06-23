'use server'

import { revalidatePath } from 'next/cache'
import {
  createAnnotationConfig,
  createDemoDataset,
  createExperiment,
  createMockExperimentRun,
  createPromptVersion,
  getDatasetExamples
} from './phoenix'

export async function createPromptAction(formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const description = String(formData.get('description') ?? '')
  const systemPrompt = String(formData.get('systemPrompt') ?? '')
  const userTemplate = String(formData.get('userTemplate') ?? '')
  const modelProvider = String(formData.get('modelProvider') ?? 'OPENAI') as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OLLAMA'
  const modelName = String(formData.get('modelName') ?? 'gpt-4o-mini')
  const tag = String(formData.get('tag') ?? '')

  if (!name || !systemPrompt || !userTemplate) throw new Error('Prompt incomplet')

  await createPromptVersion({ name, description, systemPrompt, userTemplate, modelProvider, modelName, tag })
  revalidatePath('/prompts')
}

export async function createCriteriaAction(formData: FormData) {
  const name = String(formData.get('name') ?? '')
  const description = String(formData.get('description') ?? '')
  const type = String(formData.get('type') ?? 'CONTINUOUS') as 'CATEGORICAL' | 'CONTINUOUS' | 'FREEFORM'

  if (!name) throw new Error('Nom de critère manquant')

  await createAnnotationConfig({ name, description, type })
  revalidatePath('/criteria')
}

export async function createDemoDatasetAction() {
  await createDemoDataset()
  revalidatePath('/evals')
}

export async function launchMockEvalAction(formData: FormData) {
  const datasetId = String(formData.get('datasetId') ?? '')
  const name = String(formData.get('name') ?? `poc-eval-${Date.now()}`)

  if (!datasetId) throw new Error('Dataset manquant')

  const experiment = await createExperiment(datasetId, name)
  const examples = await getDatasetExamples(datasetId)
  const firstExample = examples.data.examples[0]

  if (firstExample) {
    await createMockExperimentRun({ experimentId: experiment.data.id, example: firstExample })
  }

  revalidatePath('/evals')
}
