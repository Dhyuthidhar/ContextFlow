import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ProjectActions from './ProjectActions'
import ProjectHeader from './ProjectHeader'

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

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id } = params

  const [projectRes, docsRes, principlesRes] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('id', id).single(),
    supabaseAdmin.from('documents').select('id, filename, doc_category, file_type, analyzed, upload_date').eq('project_id', id).order('upload_date', { ascending: false }),
    supabaseAdmin.from('principles').select('id', { count: 'exact', head: true }).contains('source_projects', [id]),
  ])

  const project = projectRes.data
  if (!project) notFound()

  const documents = docsRes.data ?? []
  const docIds = documents.map((d) => d.id)

  const chunksRes = docIds.length > 0
    ? await supabaseAdmin.from('document_chunks').select('id', { count: 'exact', head: true }).in('document_id', docIds)
    : { count: 0 }

  const principlesCount = principlesRes.count ?? 0
  const chunksIndexed = chunksRes.count ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <ProjectHeader project={project} />

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
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(doc.upload_date)}</p>
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

        {/* RIGHT — Actions (client component) */}
        <ProjectActions projectId={id} documentCount={documents.length} />
      </div>
    </div>
  )
}
