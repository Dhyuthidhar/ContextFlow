import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

function runMCP(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3',
      ['-m', 'mcp_server.server'],
      {
        cwd: '/Users/sssd/Documents/ContextFlow/backend',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      if (stderr) console.error('[query] stderr:', stderr)
      const lines = stdout.split('\n').filter((l) => l.startsWith('{'))
      if (!lines.length) {
        reject(new Error(`No JSON response from backend (exit ${code})`))
      } else {
        resolve(lines[lines.length - 1])
      }
    })

    proc.on('error', reject)

    proc.stdin.write(payload)
    proc.stdin.end()

    setTimeout(() => {
      proc.kill()
      reject(new Error('Query timed out after 30s'))
    }, 30000)
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'contextflow_query',
        arguments: { query: body.query, project_id: body.project_id ?? null },
      },
    })

    const raw = await runMCP(payload)
    const response = JSON.parse(raw)
    const text = response.result?.content?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty result from backend' }, { status: 500 })
    }

    const result = JSON.parse(text)
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Query failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
