import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

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

    const proc = spawn(
      '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3',
      ['-m', 'mcp_server.server'],
      {
        cwd: '/Users/sssd/Documents/ContextFlow/backend',
        detached: true,
        stdio: ['pipe', 'ignore', 'ignore'],
      }
    )
    proc.stdin.write(payload)
    proc.stdin.end()
    proc.unref()

    return NextResponse.json({
      success: true,
      message: 'Analysis started. Refresh in 2-3 minutes to see new principles.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
