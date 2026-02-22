import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 60

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

    const storage_path = `${project_id}/${filename}`
    const contentBytes = Buffer.from(content, 'utf-8')

    const { error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storage_path, contentBytes, { contentType: 'text/plain', upsert: true })

    if (storageError) {
      return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 })
    }

    const { data: doc, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        project_id,
        filename,
        file_type: file_type.replace(/^\./, '').toLowerCase(),
        doc_category,
        storage_path,
        analyzed: false,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `DB insert failed: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      filename: doc.filename,
      chunk_count: 0,
      message: 'File uploaded. Click Analyze to extract principles.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
