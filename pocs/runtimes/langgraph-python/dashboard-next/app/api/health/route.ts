import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL ?? 'http://localhost:3010'

export async function GET() {
  const response = await fetch(`${LANGGRAPH_API_URL}/health`, { cache: 'no-store' })
  const json = await response.json()
  return NextResponse.json(json, { status: response.status })
}
