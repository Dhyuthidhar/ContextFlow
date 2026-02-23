'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import Link from 'next/link'

const PROJECT_TYPES = ['web_app', 'mobile', 'saas', 'api', 'library']
const STATUS_OPTIONS = ['active', 'completed', 'archived']

interface Project {
  id: string
  name: string
  description?: string | null
  project_type?: string | null
  tech_stack?: string | null
  status?: string | null
}

interface Props {
  project: Project
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {message}
    </div>
  )
}

export default function ProjectHeader({ project: initial }: Props) {
  const [project, setProject] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description ?? '')
  const [projectType, setProjectType] = useState(initial.project_type ?? 'web_app')
  const [status, setStatus] = useState(initial.status ?? 'active')
  const [tags, setTags] = useState<string[]>(parseTags(initial.tech_stack))
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function enterEdit() {
    setName(project.name)
    setDescription(project.description ?? '')
    setProjectType(project.project_type ?? 'web_app')
    setStatus(project.status ?? 'active')
    setTags(parseTags(project.tech_stack))
    setTagInput('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function addTag(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed || tags.includes(trimmed)) return
    setTags((prev) => [...prev, trimmed])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          project_type: projectType,
          tech_stack: tags.join(', ') || null,
          status,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Update failed')
      setProject(json.project)
      setEditing(false)
      showToast('Project updated successfully', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  const techStackTags = parseTags(project.tech_stack)

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-start gap-3 mb-2">
        <Link href="/projects" className="mt-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>

        {editing ? (
          <div className="flex-1 space-y-3">
            {/* Name */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-2xl font-bold text-[#0f0f0f] font-mono border-b-2 border-[#2563eb] outline-none bg-transparent pb-0.5"
              placeholder="Project name"
              autoFocus
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] resize-none"
              placeholder="Description (optional)"
            />

            {/* Type + Status row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Project Type</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:border-[#2563eb] bg-white"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:border-[#2563eb] bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tech stack tags */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tech Stack</label>
              <div
                className="flex flex-wrap gap-1.5 border border-gray-300 rounded-md px-2.5 py-2 focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb] cursor-text min-h-[38px]"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                      className="text-blue-400 hover:text-blue-700 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  className="text-sm outline-none flex-1 min-w-[120px] bg-transparent"
                  placeholder={tags.length === 0 ? 'Type and press Enter or comma…' : ''}
                />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-1.5 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0f0f0f] font-mono">{project.name}</h1>
              {project.project_type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{project.project_type}</span>
              )}
              {project.status === 'active' && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />active
                </span>
              )}
              {project.status === 'completed' && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />completed
                </span>
              )}
              {project.status === 'archived' && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />archived
                </span>
              )}
              <button
                onClick={enterEdit}
                className="ml-1 text-xs px-2.5 py-1 border border-gray-300 rounded-md text-gray-500 hover:text-[#2563eb] hover:border-[#2563eb] transition-colors font-medium"
              >
                Edit
              </button>
            </div>
            {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
            {techStackTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {techStackTags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
