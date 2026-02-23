import { NextRequest, NextResponse } from 'next/server'
import { spawnSync } from 'child_process'

export const maxDuration = 300

const PYTHON = '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3'
const BACKEND_DIR = '/Users/sssd/Documents/ContextFlow/backend'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'contextflow_analyze_project',
        arguments: { project_id: body.project_id },
      },
    })

    const result = spawnSync(PYTHON, ['-m', 'mcp_server.server'], {
      input: payload,
      cwd: BACKEND_DIR,
      encoding: 'utf8',
      timeout: 295000,
    })

    if (result.error) {
      const isTimeout = result.error.message.includes('ETIMEDOUT') || result.error.message.includes('timeout')
      return NextResponse.json(
        { error: isTimeout ? 'Analysis timed out after 5 minutes' : `Process error: ${result.error.message}` },
        { status: 500 }
      )
    }

    if (result.status !== 0) {
      console.error('[analyze] stderr:', result.stderr)
      return NextResponse.json({ error: `Backend error: ${result.stderr?.slice(0, 300)}` }, { status: 500 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(result.stdout.trim())
    } catch {
      return NextResponse.json({ error: 'Invalid response from backend' }, { status: 500 })
    }

    const text = parsed?.result?.content?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty response from backend' }, { status: 500 })
    }

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Could not parse backend result' }, { status: 500 })
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error ?? 'Analysis failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data.data,
      message: 'Analysis complete.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
