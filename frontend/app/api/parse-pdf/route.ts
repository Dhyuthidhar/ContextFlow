import { NextRequest, NextResponse } from 'next/server'
import { spawnSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(req: NextRequest) {
  const tempPath = join(tmpdir(), `cf_${Date.now()}.pdf`)
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(tempPath, buffer)

    const result = spawnSync(
      '/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3',
      ['-c', `
import pypdf, json, sys
reader = pypdf.PdfReader("${tempPath}")
text = "\\n\\n".join(p.extract_text() or "" for p in reader.pages)
print(json.dumps({"text": text, "numPages": len(reader.pages)}))
      `],
      { encoding: 'utf8', timeout: 30000 }
    )

    unlinkSync(tempPath)

    if (result.error) throw result.error
    const data = JSON.parse(result.stdout.trim())
    return NextResponse.json(data)
  } catch (error) {
    try { unlinkSync(tempPath) } catch {}
    console.error('PDF parse error:', error)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
