import { NextRequest, NextResponse } from 'next/server'
import { spawnSync } from 'child_process'

export const maxDuration = 60

const PYTHON = '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3'
const BACKEND_DIR = '/Users/sssd/Documents/ContextFlow/backend'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, filename, file_type, doc_category, content } = body

    const required = ['project_id', 'filename', 'file_type', 'doc_category', 'content']
    const missing = required.filter((k: string) => !body[k])
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 })
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

    const result = spawnSync(PYTHON, ['-m', 'mcp_server.server'], {
      input: payload,
      cwd: BACKEND_DIR,
      encoding: 'utf8',
      timeout: 55000,
    })

    if (result.error) {
      return NextResponse.json({ error: `Process error: ${result.error.message}` }, { status: 500 })
    }

    if (result.status !== 0) {
      console.error('[upload] stderr:', result.stderr)
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
      return NextResponse.json({ error: data.error ?? 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document_id: data.data?.document_id,
      filename,
      chunk_count: data.data?.chunk_count ?? 0,
      message: `Uploaded and indexed ${data.data?.chunk_count ?? 0} chunks.`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
