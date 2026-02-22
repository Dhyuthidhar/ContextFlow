import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const BACKEND_DIR = path.resolve(process.cwd(), '../backend')
const PYTHON = path.join(BACKEND_DIR, '.venv', 'bin', 'python3')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, filename, file_type, doc_category, content } = body

    const required = ['project_id', 'filename', 'file_type', 'doc_category', 'content']
    const missing = required.filter((k: string) => !body[k])
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 })
    }

    const validCategories = ['architecture', 'prd', 'brd', 'chat', 'other']
    if (!validCategories.includes(doc_category)) {
      return NextResponse.json({ error: `doc_category must be one of: ${validCategories.join(', ')}` }, { status: 400 })
    }

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'contextflow_upload_document',
        arguments: { project_id, filename, file_type, doc_category, content },
      },
    })

    const { stdout, stderr } = await execFileAsync(
      PYTHON,
      ['-m', 'mcp_server.server'],
      {
        cwd: BACKEND_DIR,
        input: payload,
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      } as Parameters<typeof execFileAsync>[2] & { input: string }
    )

    if (stderr) {
      console.error('[upload] stderr:', stderr)
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
      return NextResponse.json({ error: result.error ?? 'Upload failed' }, { status: 500 })
    }

    const data = result.data ?? {}
    return NextResponse.json({
      success: true,
      document_id: data.document_id,
      filename: data.filename,
      storage_path: data.storage_path,
      chunk_count: data.chunk_count ?? 0,
      char_count: data.char_count ?? 0,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
