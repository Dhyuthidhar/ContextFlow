'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const DOC_CATEGORIES = ['architecture', 'prd', 'brd', 'chat', 'other']

const CATEGORY_AUTO: Record<string, string> = {
  architecture: 'architecture',
  arch: 'architecture',
  prd: 'prd',
  brd: 'brd',
  chat: 'chat',
  conversation: 'chat',
}

function detectCategory(filename: string): string {
  const lower = filename.toLowerCase()
  for (const [key, val] of Object.entries(CATEGORY_AUTO)) {
    if (lower.includes(key)) return val
  }
  return 'other'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type UploadStage = 'idle' | 'uploading' | 'chunking' | 'done' | 'error'

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('other')
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [chunkCount, setChunkCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(selected: File) {
    const ext = selected.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'md', 'txt'].includes(ext)) {
      setErrorMsg('Only .pdf, .md, and .txt files are supported.')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds 10MB limit.')
      return
    }
    setErrorMsg(null)
    setFile(selected)
    setCategory(detectCategory(selected.name))
    setStage('idle')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  async function handleUpload() {
    if (!file) return
    setStage('uploading')
    setErrorMsg(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'txt'
      let content = ''

      if (ext === 'pdf') {
        const formData = new FormData()
        formData.append('file', file)
        const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
        if (!parseRes.ok) throw new Error('PDF parsing failed')
        const parsed = await parseRes.json()
        content = parsed.text ?? ''
      } else {
        content = await file.text()
      }

      setStage('chunking')

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          filename: file.name,
          file_type: ext,
          doc_category: category,
          content,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Upload failed')

      setChunkCount(json.chunk_count ?? 0)
      setStage('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed')
      setStage('error')
    }
  }

  const stageLabel: Record<UploadStage, string> = {
    idle: 'Upload & Process',
    uploading: 'Uploading…',
    chunking: 'Chunking & Embedding…',
    done: 'Done!',
    error: 'Retry',
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#0f0f0f]">Upload Document</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-[#2563eb] bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.md,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-2xl">{file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.md') ? '📄' : '📝'}</p>
              <p className="text-sm font-medium text-[#0f0f0f]">{file.name}</p>
              <p className="text-xs text-gray-400">{formatBytes(file.size)} · {file.name.split('.').pop()?.toUpperCase()}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setStage('idle') }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-gray-500">Drop files here or <span className="text-[#2563eb]">click to browse</span></p>
              <p className="text-xs text-gray-400">.pdf, .md, .txt · max 10MB</p>
            </div>
          )}
        </div>

        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">Document Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-white"
          >
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">{errorMsg}</div>
        )}

        {/* Success */}
        {stage === 'done' && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 space-y-1">
            <p>✓ Upload complete — {chunkCount} chunks created and indexed.</p>
            <Link href={`/projects/${id}`} className="text-green-700 underline font-medium">← Back to project</Link>
          </div>
        )}

        {/* Progress indicator */}
        {(stage === 'uploading' || stage === 'chunking') && (
          <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md">
            <svg className="animate-spin w-4 h-4 text-[#2563eb] shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <div className="flex gap-2 text-xs text-blue-700">
              <span className={stage === 'uploading' ? 'font-semibold' : 'text-blue-400'}>Uploading…</span>
              <span className="text-blue-300">→</span>
              <span className={stage === 'chunking' ? 'font-semibold' : 'text-blue-400'}>Chunking…</span>
              <span className="text-blue-300">→</span>
              <span className="text-blue-400">Done</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={!file || stage === 'uploading' || stage === 'chunking' || stage === 'done'}
          className="w-full py-2.5 px-4 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stageLabel[stage]}
        </button>
      </div>
    </div>
  )
}
