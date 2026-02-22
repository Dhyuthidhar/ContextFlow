import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const BACKEND_DIR = path.resolve(process.cwd(), '../backend')
const PYTHON = path.join(BACKEND_DIR, '.venv', 'bin', 'python3')

export async function POST(req: NextRequest) {
  try {
    const { query, project_id } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'contextflow_query',
        arguments: { query, project_id: project_id ?? null },
      },
    })

    const { stdout, stderr } = await execFileAsync(
      PYTHON,
      ['-m', 'mcp_server.server'],
      {
        cwd: BACKEND_DIR,
        input: payload,
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      } as Parameters<typeof execFileAsync>[2] & { input: string }
    )

    if (stderr) {
      console.error('[query] stderr:', stderr)
    }

    const line = String(stdout).trim().split('\n').find((l: string) => l.startsWith('{'))
    if (!line) {
      return NextResponse.json({ error: 'No response from backend' }, { status: 500 })
    }

    const rpcResponse = JSON.parse(line)
    if (rpcResponse.error) {
      return NextResponse.json({ error: rpcResponse.error.message ?? 'RPC error' }, { status: 500 })
    }

    const text = rpcResponse.result?.content?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty result from backend' }, { status: 500 })
    }

    const result = JSON.parse(text)
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Query failed' }, { status: 500 })
    }

    const data = result.data ?? {}
    return NextResponse.json({
      success: true,
      query: data.query,
      intent: data.intent,
      project_context: data.project_context ?? [],
      principles: data.principles ?? [],
      related_context: data.related_context ?? {},
      meta: data.meta ?? {},
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
