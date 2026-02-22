'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, MVP_USER_ID } from '@/lib/supabase'

interface FormData {
  name: string
  project_type: string
  description: string
  tech_stack: string
}

const PROJECT_TYPES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'web_app', label: 'Web App' },
  { value: 'api', label: 'API' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'library', label: 'Library' },
  { value: 'other', label: 'Other' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    project_type: '',
    description: '',
    tech_stack: '',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validate(): boolean {
    const newErrors: Partial<FormData> = {}
    if (!formData.name.trim()) newErrors.name = 'Project name is required'
    if (!formData.project_type) newErrors.project_type = 'Project type is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSubmitError(null)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: MVP_USER_ID,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        project_type: formData.project_type,
        tech_stack: formData.tech_stack.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      setSubmitError(error.message)
      setLoading(false)
      return
    }

    router.push(`/projects/${data.id}`)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projects" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#0f0f0f]">New Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="My Awesome Project"
            className={`w-full px-3 py-2 text-sm border rounded-md outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] ${
              errors.name ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">
            Project Type <span className="text-red-500">*</span>
          </label>
          <select
            name="project_type"
            value={formData.project_type}
            onChange={handleChange}
            className={`w-full px-3 py-2 text-sm border rounded-md outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-white ${
              errors.project_type ? 'border-red-400' : 'border-gray-300'
            }`}
          >
            <option value="">Select a type…</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {errors.project_type && <p className="mt-1 text-xs text-red-500">{errors.project_type}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What is this project about?"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0f0f0f] mb-1.5">
            Tech Stack <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="tech_stack"
            value={formData.tech_stack}
            onChange={handleChange}
            placeholder="Python, Supabase, OpenAI"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
          />
        </div>

        {submitError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600">{submitError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 bg-[#2563eb] text-white text-sm font-medium rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating…
              </>
            ) : (
              'Create Project'
            )}
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
