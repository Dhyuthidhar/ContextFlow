'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Project {
  id: string
  name: string
  description: string | null
  project_type: string
  status: string
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  saas: 'bg-purple-100 text-purple-700',
  web_app: 'bg-blue-100 text-blue-700',
  api: 'bg-green-100 text-green-700',
  mobile: 'bg-orange-100 text-orange-700',
  library: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-600',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, project_type, status, created_at')
        .order('created_at', { ascending: false })
      setProjects(data ?? [])
      setLoading(false)
    }
    fetchProjects()
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#0f0f0f]">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Project
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <p className="text-gray-500 text-sm">No projects yet. Create your first project.</p>
          <Link
            href="/projects/new"
            className="mt-4 px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-[#0f0f0f] font-mono text-sm leading-tight">{project.name}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  {project.status === 'active' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      active
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[project.project_type] ?? TYPE_COLORS.other}`}>
                    {project.project_type}
                  </span>
                </div>
              </div>

              {project.description && (
                <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{project.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">{timeAgo(project.created_at)}</span>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-[#2563eb] border border-[#2563eb] rounded-md hover:bg-blue-50 transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/projects/${project.id}/upload`}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#2563eb] rounded-md hover:bg-[#1d4ed8] transition-colors"
                  >
                    Add Data
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
