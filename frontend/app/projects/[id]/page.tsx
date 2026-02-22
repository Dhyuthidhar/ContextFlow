'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  name: string
  description: string | null
  project_type: string
  status: string
  tech_stack: string | null
  created_at: string
}

interface Document {
  id: string
  filename: string
  doc_category: string
  file_type: string
  analyzed: boolean
  created_at: string
}

interface AnalyzeResult {
  principles_created?: number
  principles_updated?: number
  message?: string
}

interface QueryResult {
  principles?: Array<{ content: string; category: string; confidence: number; when_to_use?: string }>
  project_context?: Array<{ filename: string; content: string; similarity: number }>
  related_context?: Record<string, Array<{ content: string; confidence: number }>>
}

const CATEGORY_COLORS: Record<string, string> = {
  architecture: 'bg-blue-100 text-blue-700',
  prd: 'bg-purple-100 text-purple-700',
  brd: 'bg-indigo-100 text-indigo-700',
  chat: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

const FILE_ICONS: Record<string, string> = {
  md: '📄',
  pdf: '📕',
  txt: '📝',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [principlesCount, setPrinciplesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const [projectRes, docsRes, principlesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('documents').select('id, filename, doc_category, file_type, analyzed, created_at').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('principles').select('id', { count: 'exact' }).eq('source', 'user_derived'),
      ])
      setProject(projectRes.data)
      setDocuments(docsRes.data ?? [])
      setPrinciplesCount(principlesRes.count ?? 0)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeResult(null)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setAnalyzeError(json.error ?? 'Analysis failed')
      } else {
        setAnalyzeResult(json)
        const principlesRes = await supabase.from('principles').select('id', { count: 'exact' }).eq('source', 'user_derived')
        setPrinciplesCount(principlesRes.count ?? 0)
      }
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setQuerying(true)
    setQueryResult(null)
    setQueryError(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), project_id: id }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setQueryError(json.error ?? 'Query failed')
      } else {
        setQueryResult(json)
      }
    } catch (e: unknown) {
      setQueryError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setQuerying(false)
    }
  }

  const analyzedCount = documents.filter((d) => d.analyzed).length
  const chunksIndexed = analyzedCount > 0 ? `~${analyzedCount * 5}` : '0'

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Project not found.</p>
        <Link href="/projects" className="text-[#2563eb] text-sm mt-2 inline-block">← Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <Link href="/projects" className="mt-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0f0f0f] font-mono">{project.name}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{project.project_type}</span>
            {project.status === 'active' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />active
              </span>
            )}
          </div>
          {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
          {project.tech_stack && <p className="text-gray-400 text-xs mt-0.5">Stack: {project.tech_stack}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
        {[
          { label: 'Documents Uploaded', value: documents.length },
          { label: 'Chunks Indexed', value: chunksIndexed },
          { label: 'Principles Extracted', value: principlesCount },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-2xl font-bold text-[#0f0f0f]">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#0f0f0f] text-sm">Documents</h2>
            <Link
              href={`/projects/${id}/upload`}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] transition-colors font-medium"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload Document
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400 text-sm">No documents yet.</p>
              <Link href={`/projects/${id}/upload`} className="text-[#2563eb] text-xs mt-1 inline-block hover:underline">Upload your first document →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <span className="text-lg shrink-0">{FILE_ICONS[doc.file_type] ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f0f0f] truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(doc.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[doc.doc_category] ?? CATEGORY_COLORS.other}`}>
                      {doc.doc_category}
                    </span>
                    {doc.analyzed ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Analyzed ✓</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Actions */}
        <div className="space-y-5">
          {/* Analyze */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-[#0f0f0f] text-sm mb-1">Analyze Project</h2>
            <p className="text-xs text-gray-500 mb-4">Extract principles and patterns from all uploaded documents. May take 60+ seconds.</p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || documents.length === 0}
              className="w-full py-2.5 px-4 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing… (this may take a while)
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Analyze Project
                </>
              )}
            </button>
            {analyzeResult && (
              <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
                ✓ {analyzeResult.principles_created ?? 0} principles created, {analyzeResult.principles_updated ?? 0} updated
                {analyzeResult.message && <span className="block text-green-600 mt-0.5">{analyzeResult.message}</span>}
              </div>
            )}
            {analyzeError && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">{analyzeError}</div>
            )}
          </div>

          {/* Query */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-[#0f0f0f] text-sm mb-1">Query Project</h2>
            <p className="text-xs text-gray-500 mb-4">Ask a question about this project's engineering context.</p>
            <form onSubmit={handleQuery} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="How should I handle API errors?"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
              <button
                type="submit"
                disabled={querying || !query.trim()}
                className="px-4 py-2 bg-[#0f0f0f] text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {querying ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : 'Ask'}
              </button>
            </form>

            {queryError && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">{queryError}</div>
            )}

            {queryResult && (
              <div className="mt-4 space-y-3">
                {queryResult.project_context && queryResult.project_context.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">From Your Docs</p>
                    {queryResult.project_context.slice(0, 2).map((ctx, i) => (
                      <div key={i} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-md mb-2">
                        <p className="text-xs font-medium text-blue-700 mb-1">{ctx.filename}</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{ctx.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {queryResult.principles && queryResult.principles.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Principles</p>
                    {queryResult.principles.slice(0, 3).map((p, i) => (
                      <div key={i} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md mb-2">
                        <p className="text-xs text-gray-700 leading-relaxed">{p.content}</p>
                        {p.when_to_use && <p className="text-xs text-gray-400 mt-1">Use when: {p.when_to_use}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400">{p.category}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">confidence {Math.round(p.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
