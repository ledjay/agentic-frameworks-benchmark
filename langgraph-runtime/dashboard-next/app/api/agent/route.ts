import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL ?? 'http://localhost:3010'

export async function POST(request: Request) {
  const body = await request.text()
  const response = await fetch(`${LANGGRAPH_API_URL}/api/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}
