'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
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

function fileIcon(name: string) {
  if (name.endsWith('.pdf')) return '📕'
  if (name.endsWith('.md')) return '📄'
  return '📝'
}

type FileStatus = 'waiting' | 'parsing' | 'uploading' | 'done' | 'error'

interface FileEntry {
  id: string
  file: File
  category: string
  status: FileStatus
  chunkCount?: number
  error?: string
}

export default function UploadPage() {
  const params = useParams()
  const id = params.id as string

  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [globalCategory, setGlobalCategory] = useState('other')
  const [running, setRunning] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const valid: FileEntry[] = []
    for (const f of arr) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      if (!['pdf', 'md', 'txt'].includes(ext)) continue
      if (f.size > 10 * 1024 * 1024) continue
      valid.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        category: detectCategory(f.name),
        status: 'waiting',
      })
    }
    setEntries((prev) => [...prev, ...valid])
    setAllDone(false)
  }

  function removeEntry(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  function updateEntry(entryId: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, ...patch } : e))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  async function uploadOne(entry: FileEntry): Promise<void> {
    const ext = entry.file.name.split('.').pop()?.toLowerCase() ?? 'txt'
    let content = ''

    updateEntry(entry.id, { status: 'parsing' })

    if (ext === 'pdf') {
      const formData = new FormData()
      formData.append('file', entry.file)
      const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      if (!parseRes.ok) throw new Error('PDF parsing failed')
      const parsed = await parseRes.json()
      content = parsed.text ?? ''
    } else {
      content = await entry.file.text()
    }

    updateEntry(entry.id, { status: 'uploading' })

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: id,
        filename: entry.file.name,
        file_type: ext,
        doc_category: entry.category,
        content,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error ?? 'Upload failed')

    updateEntry(entry.id, { status: 'done', chunkCount: json.chunk_count ?? 0 })
  }

  async function handleUploadAll() {
    if (entries.length === 0 || running) return
    setRunning(true)
    setAllDone(false)

    const toUpload = entries.filter((e) => e.status === 'waiting' || e.status === 'error')

    for (const entry of toUpload) {
      try {
        await uploadOne(entry)
      } catch (err) {
        updateEntry(entry.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    }

    setRunning(false)
    setAllDone(true)
  }

  const statusIcon: Record<FileStatus, string> = {
    waiting: '⏳',
    parsing: '🔄',
    uploading: '🔄',
    done: '✅',
    error: '❌',
  }

  const statusLabel: Record<FileStatus, string> = {
    waiting: 'Waiting',
    parsing: 'Parsing…',
    uploading: 'Uploading & indexing…',
    done: 'Done',
    error: 'Failed',
  }

  const doneCount = entries.filter((e) => e.status === 'done').length
  const failedCount = entries.filter((e) => e.status === 'error').length
  const canUpload = entries.some((e) => e.status === 'waiting' || e.status === 'error') && !running

  return (
    <div className="p-8 max-w-2xl">
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
          onClick={() => !running && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            running ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${dragging ? 'border-[#2563eb] bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.md,.txt"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
          <div className="space-y-2">
            <svg className="mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-gray-500">Drop files here or <span className="text-[#2563eb]">click to browse</span></p>
            <p className="text-xs text-gray-400">.pdf, .md, .txt · max 10MB each · multiple files supported</p>
          </div>
        </div>

        {/* Default category for new files */}
        {entries.length === 0 && (
          <div>
            <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">Default Category</label>
            <select
              value={globalCategory}
              onChange={(e) => setGlobalCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-white"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        )}

        {/* File list */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {entries.length} file{entries.length !== 1 ? 's' : ''} selected
            </p>
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-lg shrink-0">{statusIcon[entry.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#0f0f0f] truncate">{fileIcon(entry.file.name)} {entry.file.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatBytes(entry.file.size)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${
                      entry.status === 'done' ? 'text-green-600' :
                      entry.status === 'error' ? 'text-red-500' :
                      entry.status === 'waiting' ? 'text-gray-400' : 'text-blue-600'
                    }`}>
                      {entry.status === 'done' && entry.chunkCount !== undefined
                        ? `Done — ${entry.chunkCount} chunks indexed`
                        : entry.status === 'error'
                        ? `Failed: ${entry.error}`
                        : statusLabel[entry.status]}
                    </span>
                    {(entry.status === 'parsing' || entry.status === 'uploading') && (
                      <svg className="animate-spin w-3 h-3 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={entry.category}
                    onChange={(e) => updateEntry(entry.id, { category: e.target.value })}
                    disabled={running || entry.status === 'done'}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white outline-none focus:border-[#2563eb] disabled:opacity-50"
                  >
                    {DOC_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  {!running && entry.status !== 'uploading' && entry.status !== 'parsing' && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary after all done */}
        {allDone && entries.length > 0 && (
          <div className={`px-3 py-2 rounded-md text-xs border ${
            failedCount === 0
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            {failedCount === 0
              ? `✓ ${doneCount}/${entries.length} files uploaded successfully`
              : `${doneCount}/${entries.length} uploaded — ${failedCount} failed`}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleUploadAll}
            disabled={!canUpload}
            className="flex-1 py-2.5 px-4 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running
              ? 'Uploading…'
              : entries.length === 0
              ? 'Select files to upload'
              : `Upload ${entries.filter((e) => e.status === 'waiting' || e.status === 'error').length} file${entries.filter((e) => e.status === 'waiting' || e.status === 'error').length !== 1 ? 's' : ''}`}
          </button>
          {allDone && doneCount > 0 && (
            <Link
              href={`/projects/${id}`}
              className="py-2.5 px-4 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Go to Project →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
