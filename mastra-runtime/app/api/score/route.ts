import { NextResponse } from 'next/server'
import { scoreNaivety } from '../../../src/lib/ansu-contract'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json(scoreNaivety(body.input, body.output))
}
