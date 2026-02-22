'use client'

import { useState } from 'react'

interface AnalyzeResult {
  principles_created?: number
  principles_updated?: number
  jobs_processed?: number
  message?: string
}

interface QueryResult {
  principles?: Array<{ content: string; category: string; confidence: number; when_to_use?: string }>
  project_context?: Array<{ filename: string; content: string; similarity: number }>
}

interface Props {
  projectId: string
  documentCount: number
}

export default function ProjectActions({ projectId, documentCount }: Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeResult(null)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setAnalyzeError(json.error ?? 'Analysis failed')
        return
      }
      setAnalyzeResult({ message: json.message })
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
        body: JSON.stringify({ query: query.trim(), project_id: projectId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setQueryError(json.error ?? 'Query failed')
        return
      }
      setQueryResult(json.data ?? {})
    } catch (e: unknown) {
      setQueryError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Analyze */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[#0f0f0f] text-sm mb-1">Analyze Project</h2>
        <p className="text-xs text-gray-500 mb-4">Extract principles and patterns from all uploaded documents. May take 60+ seconds.</p>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || documentCount === 0}
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
            ✓ {analyzeResult.message ?? 'Analysis started in background.'}
          </div>
        )}
        {analyzeError && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">{analyzeError}</div>
        )}
      </div>

      {/* Query */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[#0f0f0f] text-sm mb-1">Query Project</h2>
        <p className="text-xs text-gray-500 mb-4">Ask a question about this project&apos;s engineering context.</p>
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
  )
}
