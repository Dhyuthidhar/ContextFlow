import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    return NextResponse.json({
      text: `[PDF content from ${file.name} - will be extracted during analysis]`,
      filename: file.name,
      size: file.size,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
