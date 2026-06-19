'use server'

import { revalidatePath } from 'next/cache'
import { annotateTrace } from './phoenix'

export async function createTraceFeedback(formData: FormData) {
  const projectName = String(formData.get('projectName') ?? '')
  const traceId = String(formData.get('traceId') ?? '')
  const label = String(formData.get('label') ?? '')
  const explanation = String(formData.get('explanation') ?? '')
  const score = Number(formData.get('score') ?? 0)

  if (!projectName || !traceId || !label || !explanation) {
    throw new Error('Feedback incomplet')
  }

  await annotateTrace({ traceId, label, score, explanation })
  revalidatePath(`/projects/${encodeURIComponent(projectName)}/traces/${traceId}`)
  revalidatePath(`/projects/${encodeURIComponent(projectName)}`)
}
