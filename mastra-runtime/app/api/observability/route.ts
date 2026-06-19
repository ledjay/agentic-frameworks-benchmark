import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MASTRA_BASE_URL = process.env.MASTRA_BASE_URL ?? 'http://localhost:4111'

async function safeMastraFetch(path: string) {
  try {
    return await fetch(`${MASTRA_BASE_URL}${path}`, { cache: 'no-store' })
  } catch {
    return new Response(JSON.stringify({ unavailableReason: 'Mastra API unreachable' }), { status: 503 })
  }
}

type AnyRecord = Record<string, unknown>

type SessionSummary = {
  id: string
  label: string
  userId?: string
  notion?: string
  matiere?: string
  niveauScolaire?: string
  spanCount: number
  traceIds: string[]
  lastSeen?: string
  sampleSpans: Array<{
    name: string
    spanType: string
    traceId: string
    startedAt?: string
  }>
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : undefined
}

function pickString(record: AnyRecord | undefined, keys: string[]): string | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

function nestedSources(span: AnyRecord): Array<AnyRecord | undefined> {
  const attributes = asRecord(span.attributes)
  return [
    span,
    attributes,
    asRecord(span.metadata),
    asRecord(attributes?.metadata),
    asRecord(span.requestContext),
    asRecord(attributes?.requestContext),
    asRecord(span.correlationContext),
    asRecord(attributes?.correlationContext)
  ]
}

function getField(span: AnyRecord, keys: string[]): string | undefined {
  for (const source of nestedSources(span)) {
    const found = pickString(source, keys)
    if (found) return found
  }
  return undefined
}

function timestampOf(span: AnyRecord): string | undefined {
  return getField(span, ['startTime', 'startedAt', 'createdAt', 'timestamp', 'endTime', 'endedAt'])
}

function buildSessions(spans: unknown): SessionSummary[] {
  const spanList = Array.isArray(spans) ? spans.filter((span): span is AnyRecord => Boolean(asRecord(span))) : []
  const sessions = new Map<string, SessionSummary>()

  for (const span of spanList) {
    const runId = getField(span, ['runId', 'run_id'])
    const sessionId = getField(span, ['sessionId', 'session_id', 'threadId', 'thread_id']) ?? runId?.split(':')[0]
    if (!sessionId) continue

    const traceId = getField(span, ['traceId', 'trace_id']) ?? '—'
    const startedAt = timestampOf(span)
    const current = sessions.get(sessionId) ?? {
      id: sessionId,
      label: getField(span, ['ansuSessionLabel', 'sessionLabel']) ?? sessionId,
      userId: getField(span, ['userId', 'user_id']),
      notion: getField(span, ['notion']),
      matiere: getField(span, ['matiere']),
      niveauScolaire: getField(span, ['niveauScolaire', 'niveau_scolaire']),
      spanCount: 0,
      traceIds: [],
      lastSeen: undefined,
      sampleSpans: []
    }

    current.spanCount += 1
    if (traceId !== '—' && !current.traceIds.includes(traceId)) current.traceIds.push(traceId)
    if (startedAt && (!current.lastSeen || new Date(startedAt).getTime() > new Date(current.lastSeen).getTime())) {
      current.lastSeen = startedAt
    }
    if (current.sampleSpans.length < 5) {
      current.sampleSpans.push({
        name: getField(span, ['name']) ?? '—',
        spanType: getField(span, ['spanType', 'span_type', 'type']) ?? '—',
        traceId,
        startedAt
      })
    }

    sessions.set(sessionId, current)
  }

  return Array.from(sessions.values()).sort((a, b) => {
    const left = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
    const right = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
    return right - left
  })
}

export async function GET() {
  const [tracesResponse, scoresResponse, scorersResponse] = await Promise.all([
    safeMastraFetch('/api/observability/traces?perPage=80'),
    safeMastraFetch('/api/observability/scores?perPage=20'),
    safeMastraFetch('/api/scores/scorers')
  ])

  const [traces, scoresRaw, scorers] = await Promise.all([
    tracesResponse.json().catch(() => ({ spans: [] })),
    scoresResponse.json().catch(() => ({ scores: [] })),
    scorersResponse.json().catch(() => ({}))
  ])
  const scores = Array.isArray(scoresRaw?.scores) ? scoresRaw : { scores: [], unavailableReason: scoresRaw?.error }
  const sessions = buildSessions(traces?.spans)

  return NextResponse.json({ traces, scores, scorers, sessions })
}
