import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const BACKEND_DIR = path.resolve(process.cwd(), '../backend')
const PYTHON = path.join(BACKEND_DIR, '.venv', 'bin', 'python3')

export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'contextflow_analyze_project',
        arguments: { project_id },
      },
    })

    const { stdout, stderr } = await execFileAsync(
      PYTHON,
      ['-m', 'mcp_server.server'],
      {
        cwd: BACKEND_DIR,
        input: payload,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      } as Parameters<typeof execFileAsync>[2] & { input: string }
    )

    if (stderr) {
      console.error('[analyze] stderr:', stderr)
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
      return NextResponse.json({ error: result.error ?? 'Analysis failed' }, { status: 500 })
    }

    const data = result.data ?? {}
    return NextResponse.json({
      success: true,
      principles_created: data.principles_created ?? 0,
      principles_updated: data.principles_updated ?? 0,
      jobs_processed: data.jobs_processed ?? 0,
      message: data.message,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
