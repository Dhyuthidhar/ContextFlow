import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buffer)

    return NextResponse.json({
      text: data.text,
      numPages: data.numpages,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
