import { NextRequest, NextResponse } from 'next/server'
import { spawnSync } from 'child_process'

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

    const result = spawnSync(
      '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3',
      ['-m', 'mcp_server.server'],
      {
        input: payload,
        cwd: '/Users/sssd/Documents/ContextFlow/backend',
        timeout: 180000,
        encoding: 'utf8',
      }
    )

    if (result.error) throw result.error
    if (result.stderr) console.error('[analyze] stderr:', result.stderr)

    const lines = result.stdout.split('\n').filter((l: string) => l.startsWith('{'))
    if (!lines.length) {
      return NextResponse.json({ error: 'No response from backend' }, { status: 500 })
    }

    const response = JSON.parse(lines[lines.length - 1])
    return NextResponse.json({ success: true, data: response.result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
