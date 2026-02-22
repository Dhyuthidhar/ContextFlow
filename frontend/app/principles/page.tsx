'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Principle {
  id: string
  content: string
  type: string
  category: string
  source: string
  confidence_score: number
  times_applied: number
  when_to_use: string | null
  when_not_to_use: string | null
  created_at: string
}

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  pattern:            { label: 'Pattern',            className: 'bg-blue-100 text-blue-700' },
  decision_framework: { label: 'Decision Framework', className: 'bg-purple-100 text-purple-700' },
  lesson:             { label: 'Lesson',             className: 'bg-amber-100 text-amber-700' },
  error_solution:     { label: 'Error Solution',     className: 'bg-red-100 text-red-700' },
}

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  user_derived: { label: 'Your data', className: 'bg-green-100 text-green-700' },
  generic:      { label: 'Generic',   className: 'bg-gray-100 text-gray-500' },
}

const CATEGORIES = [
  'auth', 'payment', 'api', 'database', 'frontend', 'backend',
  'security', 'deployment', 'testing', 'performance', 'error_handling',
]

const TYPES = ['pattern', 'decision_framework', 'lesson', 'error_solution']

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.75 ? 'bg-green-500' :
    score >= 0.5  ? 'bg-yellow-400' :
                    'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Confidence</span>
        <span className="text-xs font-medium text-gray-600">{score.toFixed(2)}</span>
      </div>
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PrinciplesPage() {
  const [principles, setPrinciples] = useState<Principle[]>([])
  const [loading, setLoading] = useState(true)

  const [sourceFilter, setSourceFilter] = useState<'all' | 'user_derived' | 'generic'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [minConfidence, setMinConfidence] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('principles')
        .select('id, content, type, category, source, confidence_score, times_applied, when_to_use, when_not_to_use, created_at')
        .order('confidence_score', { ascending: false })
      setPrinciples(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = useMemo(() => {
    return principles.filter((p) => {
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (p.confidence_score < minConfidence) return false
      if (search && !p.content.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [principles, sourceFilter, categoryFilter, typeFilter, minConfidence, search])

  const stats = useMemo(() => {
    if (!principles.length) return null
    const userDerived = principles.filter((p) => p.source === 'user_derived').length
    const avgConf = principles.reduce((s, p) => s + p.confidence_score, 0) / principles.length
    const catCounts: Record<string, number> = {}
    for (const p of principles) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    return { total: principles.length, userDerived, avgConf, topCat }
  }, [principles])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#0f0f0f]">Principles</h1>
        {!loading && (
          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
            {principles.length} total
          </span>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',          value: stats.total },
            { label: 'Your Principles', value: stats.userDerived },
            { label: 'Avg Confidence', value: stats.avgConf.toFixed(2) },
            { label: 'Top Category',   value: stats.topCat },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-lg font-bold text-[#0f0f0f]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 mb-6 flex flex-wrap items-center gap-3 sticky top-0 z-10">
        {/* Source toggle */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
          {(['all', 'user_derived', 'generic'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                sourceFilter === s ? 'bg-[#0f0f0f] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s === 'user_derived' ? 'Your Principles' : 'Generic'}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#2563eb] bg-white text-gray-600"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#2563eb] bg-white text-gray-600"
        >
          <option value="all">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_STYLES[t]?.label ?? t}</option>)}
        </select>

        {/* Confidence slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Min confidence</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-24 accent-[#2563eb]"
          />
          <span className="text-xs font-medium text-gray-600 w-8">{minConfidence.toFixed(1)}</span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[160px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search principles…"
            className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#2563eb]"
          />
        </div>

        {filtered.length !== principles.length && (
          <span className="text-xs text-gray-400">{filtered.length} shown</span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-5 w-12 bg-gray-100 rounded-full" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-1 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-400 text-sm">No principles match your filters.</p>
          <button
            onClick={() => { setSourceFilter('all'); setCategoryFilter('all'); setTypeFilter('all'); setMinConfidence(0); setSearch('') }}
            className="mt-3 text-xs text-[#2563eb] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const typeStyle = TYPE_STYLES[p.type] ?? { label: p.type, className: 'bg-gray-100 text-gray-600' }
            const sourceStyle = SOURCE_STYLES[p.source] ?? { label: p.source, className: 'bg-gray-100 text-gray-500' }
            return (
              <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle.className}`}>
                    {typeStyle.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    {p.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceStyle.className}`}>
                    {sourceStyle.label}
                  </span>
                </div>

                {/* Confidence */}
                <ConfidenceBar score={p.confidence_score} />

                {/* Content */}
                <p className="text-sm text-[#0f0f0f] leading-relaxed font-mono">{p.content}</p>

                {/* When to use / avoid */}
                {p.when_to_use && (
                  <p className="text-xs text-green-700 leading-relaxed">
                    <span className="font-semibold">✓ Use when:</span> {p.when_to_use}
                  </p>
                )}
                {p.when_not_to_use && (
                  <p className="text-xs text-red-600 leading-relaxed">
                    <span className="font-semibold">✗ Avoid when:</span> {p.when_not_to_use}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {p.times_applied > 0 && (
                      <span className="text-xs text-gray-400">Applied {p.times_applied}×</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-300">{formatDate(p.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
