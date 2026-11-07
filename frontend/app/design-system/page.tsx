'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  NavItem,
  Panel,
  RoleOption,
  RoleSelector,
  TextField,
} from '@/components/ui'

const organizationRoles: RoleOption[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Holds final organization authority and protected product-rule approval responsibility.',
    allowedActions: ['Approve employee accounts', 'Approve Admin role changes', 'Approve protected product-rule changes'],
    restrictions: ['Cannot replace required client sign-off', 'Cannot bypass audit history'],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Operates employee onboarding and project access under Owner-governed organization controls.',
    allowedActions: ['Approve ordinary employee accounts', 'Assign project access', 'Propose Admin promotion or demotion'],
    restrictions: ['Admin role changes require Owner approval', 'Cannot approve protected product-rule changes'],
  },
  {
    id: 'member',
    name: 'Member',
    description: 'An approved employee identity that receives access only through explicit project grants.',
    allowedActions: ['Sign in when account is active', 'Receive an assigned project role', 'View their own access state'],
    restrictions: ['No project access without a grant', 'Cannot approve accounts or organization roles'],
  },
]

const projectRoles: RoleOption[] = [
  {
    id: 'project-admin',
    name: 'Project Admin',
    description: 'Coordinates an assigned project within organization-level access boundaries.',
    allowedActions: ['Use authorized project context', 'Review project access needs', 'Coordinate project workflows'],
    restrictions: ['Cannot change organization roles', 'Grant delegation awaits CTO approval'],
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Builds against authorized project context and proposes clarifications.',
    allowedActions: ['Read assigned project context', 'Upload authorized sources', 'Propose decisions and changes'],
    restrictions: ['Cannot manage organization access', 'Cannot approve protected product-rule changes'],
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Reviews evidence, conflicts, and implementation alignment in an assigned project.',
    allowedActions: ['Review assigned project context', 'Classify conflicts', 'Request implementation changes'],
    restrictions: ['Cannot grant organization membership', 'Cannot approve protected product-rule changes'],
  },
]

interface ApprovalRow {
  id: string
  employee: string
  requestedRole: string
  project: string
  status: 'Pending' | 'Approved' | 'Needs review'
}

const approvals: ApprovalRow[] = [
  { id: '1', employee: 'Aarav Mehta', requestedRole: 'Developer', project: 'OMNIX', status: 'Pending' },
  { id: '2', employee: 'Nila Shah', requestedRole: 'Reviewer', project: 'ContextFlow', status: 'Approved' },
  { id: '3', employee: 'Sam Rivera', requestedRole: 'Agent operator', project: 'OMNIX', status: 'Needs review' },
]

const statusTone = {
  Pending: 'warning',
  Approved: 'success',
  'Needs review': 'danger',
} as const

export default function DesignSystemPage() {
  const [selectedOrganizationRole, setSelectedOrganizationRole] = useState('member')
  const [selectedProjectRole, setSelectedProjectRole] = useState('developer')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const closeDialog = () => setDialogOpen(false)

  return (
    <div data-testid="design-system-review" className="cf-ui fixed inset-0 z-[100] overflow-y-auto bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b-3 border-strong-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-cf-4 px-cf-4 py-cf-3 sm:px-cf-6">
          <div>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">ContextFlow V1</p>
            <p className="text-cf-lg font-black">Design-system review</p>
          </div>
          <nav aria-label="Review sections" className="flex flex-wrap gap-cf-2">
            <NavItem href="#foundations" active>Foundations</NavItem>
            <NavItem href="#roles">Roles</NavItem>
            <NavItem href="#workflows">Workflows</NavItem>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-cf-8 px-cf-4 py-cf-8 sm:px-cf-6">
        <section aria-labelledby="review-title" className="grid gap-cf-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge tone="accent">PR 2A representative set</Badge>
            <h1 id="review-title" className="mt-cf-4 max-w-4xl text-cf-2xl font-black text-balance">
              Bold boundaries. Clear authority. No ambiguity.
            </h1>
            <p className="mt-cf-3 max-w-3xl text-cf-md text-ink-muted">
              A restrained Neobrutalist foundation for authentication, employee approval, role selection,
              document governance, and later ContextFlow workflows.
            </p>
          </div>
          <Panel muted>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest">Review boundary</p>
            <p className="mt-cf-2 text-cf-sm">
              This surface validates new primitives only. Existing dashboard pages and business behavior are unchanged.
            </p>
          </Panel>
        </section>

        <section id="foundations" aria-labelledby="foundations-title" className="space-y-cf-4 scroll-mt-52">
          <div>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">CF-DS-02 / CF-DS-03</p>
            <h2 id="foundations-title" className="text-cf-xl font-black">Foundations and interaction states</h2>
          </div>

          <div className="grid gap-cf-4 lg:grid-cols-2">
            <Panel>
              <h3 className="text-cf-lg font-black">Actions</h3>
              <div className="mt-cf-4 flex flex-wrap items-center gap-cf-4" data-a11y-contrast>
                <Button>Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Reject request</Button>
                <Button variant="quiet">Quiet action</Button>
                <Button disabled>Unavailable</Button>
                <Button loading>Checking context</Button>
              </div>
              <p className="mt-cf-4 text-cf-xs text-ink-muted">
                Hover, press, focus-visible, disabled, and loading states use the same border and motion contract.
              </p>
            </Panel>

            <Panel>
              <h3 className="text-cf-lg font-black">Status language</h3>
              <div className="mt-cf-4 flex flex-wrap gap-cf-3" data-a11y-contrast>
                <Badge>Draft</Badge>
                <Badge tone="accent">Current context</Badge>
                <Badge tone="success">Approved</Badge>
                <Badge tone="warning">Pending review</Badge>
                <Badge tone="danger">Conflict</Badge>
              </div>
              <p className="mt-cf-4 text-cf-xs text-ink-muted">
                Every color is paired with explicit text. Status never relies on color alone.
              </p>
            </Panel>
          </div>
        </section>

        <section aria-labelledby="auth-title" className="grid gap-cf-6 lg:grid-cols-2">
          <Panel>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">Authentication pattern</p>
            <h2 id="auth-title" className="mt-cf-2 text-cf-xl font-black">Sign in to ContextFlow</h2>
            <p className="mt-cf-2 text-cf-sm text-ink-muted">
              Continue with your approved company Google Workspace identity. Public signup is not available.
            </p>
            <div className="mt-cf-6 space-y-cf-4">
              <Button type="button">Continue with Google Workspace</Button>
              <p className="text-cf-xs text-ink-muted">
                Google verifies identity; ContextFlow separately enforces account status, roles, and project grants.
              </p>
            </div>
          </Panel>

          <Panel muted>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">Account states</p>
            <h2 className="mt-cf-2 text-cf-xl font-black">Access remains explicit</h2>
            <div className="mt-cf-6 space-y-cf-4" data-a11y-contrast>
              <div className="rounded-cf-sm border-2 border-strong-border bg-warning-surface p-cf-4 text-ink">
                <Badge tone="warning">Pending account</Badge>
                <p className="mt-cf-2 text-cf-sm font-bold">Approval required</p>
                <p className="mt-cf-1 text-cf-xs">
                  Workspace identity is verified. An Owner or Admin must approve this employee before access begins.
                </p>
              </div>
              <div className="rounded-cf-sm border-2 border-strong-border bg-danger-surface p-cf-4 text-ink">
                <Badge tone="danger">Disabled account</Badge>
                <p className="mt-cf-2 text-cf-sm font-bold">ContextFlow access blocked</p>
                <p className="mt-cf-1 text-cf-xs">
                  Contact an Owner or Admin. Signing in to Google Workspace does not reactivate ContextFlow access.
                </p>
              </div>
            </div>
          </Panel>
        </section>

        <section id="roles" aria-labelledby="roles-title" className="scroll-mt-52">
          <Panel>
            <RoleSelector
              legend="Choose the organization role"
              description="Organization authority is separate from project work. Admin promotion or demotion takes effect only after Owner approval."
              name="review-organization-role"
              roles={organizationRoles}
              value={selectedOrganizationRole}
              onChange={setSelectedOrganizationRole}
            />
            <div className="mt-cf-8 border-t-2 border-strong-border pt-cf-6">
              <RoleSelector
                legend="Choose the project role"
                description="Project roles apply only to explicitly granted projects and never confer organization-level authority. Exact Project Admin delegation remains a CTO decision."
                name="review-project-role"
                roles={projectRoles}
                value={selectedProjectRole}
                onChange={setSelectedProjectRole}
              />
            </div>
            <p id="roles-title" className="sr-only">Role selection</p>
          </Panel>
        </section>

        <section id="workflows" aria-labelledby="workflow-title" className="space-y-cf-4 scroll-mt-52">
          <div>
            <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">CF-DS-04 / CF-DS-05</p>
            <h2 id="workflow-title" className="text-cf-xl font-black">Approval and document patterns</h2>
          </div>

          <DataTable
            caption="Representative employee access approvals"
            rows={approvals}
            rowKey={(row) => row.id}
            columns={[
              { key: 'employee', header: 'Employee', render: (row) => <span className="font-bold">{row.employee}</span> },
              { key: 'role', header: 'Requested role', render: (row) => row.requestedRole },
              { key: 'project', header: 'Project', render: (row) => <span className="font-mono text-cf-xs">{row.project}</span> },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
            ]}
          />

          <div className="grid gap-cf-4 md:grid-cols-2">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-cf-3">
                <div>
                  <p className="font-mono text-cf-xs font-bold uppercase tracking-widest text-ink-muted">Product requirement</p>
                  <h3 className="mt-cf-1 text-cf-lg font-black">OMNIX cancellation rules.md</h3>
                </div>
                <Badge tone="warning">Draft revision</Badge>
              </div>
              <dl className="mt-cf-4 grid gap-cf-2 text-cf-sm sm:grid-cols-2">
                <div><dt className="font-bold">Version</dt><dd>v3 · proposed</dd></div>
                <div><dt className="font-bold">Evidence</dt><dd>Requirement source</dd></div>
                <div><dt className="font-bold">Owner</dt><dd>Priya N.</dd></div>
                <div><dt className="font-bold">Updated</dt><dd>6 Nov 2026</dd></div>
              </dl>
            </Panel>

            <Panel muted>
              <Badge tone="danger">Protected change</Badge>
              <h3 className="mt-cf-3 text-cf-lg font-black">CTO approval required</h3>
              <p className="mt-cf-2 text-cf-sm text-ink-muted">
                This proposal changes an approved business rule. Document ownership alone cannot authorize it.
              </p>
              <div className="mt-cf-4 flex flex-wrap gap-cf-3">
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>Review approval</Button>
                <Button variant="quiet">View source diff</Button>
              </div>
            </Panel>
          </div>
        </section>
      </main>

      <footer className="border-t-3 border-strong-border bg-action px-cf-4 py-cf-4 text-center text-cf-xs font-bold">
        Component review surface · no authentication or authorization behavior is implemented in PR 2A
      </footer>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="Review protected change"
        description="Confirm the evidence and authority before making a decision."
      >
        <div className="rounded-cf-sm border-2 border-strong-border bg-warning-surface p-cf-3 text-cf-sm">
          Client sign-off may still be required. CTO approval does not replace an external contractual obligation.
        </div>
        <div className="mt-cf-4">
          <TextField
            id="review-dialog-note"
            label="Review note"
            description="Typing here rerenders the parent preview without moving focus."
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
        </div>
        <div className="mt-cf-6 flex flex-wrap justify-end gap-cf-3">
          <Button variant="quiet" onClick={closeDialog}>Cancel</Button>
          <Button variant="danger">Reject proposal</Button>
          <Button variant="secondary">Approve change</Button>
        </div>
      </Dialog>
    </div>
  )
}
