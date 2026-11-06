'use client'

import { cn } from './cn'

export interface RoleOption {
  id: string
  name: string
  description: string
  allowedActions: string[]
  restrictions: string[]
}

export interface RoleSelectorProps {
  legend: string
  description?: string
  name: string
  roles: RoleOption[]
  value: string
  onChange: (roleId: string) => void
}

export function RoleSelector({ legend, description, name, roles, value, onChange }: RoleSelectorProps) {
  return (
    <fieldset className="cf-ui">
      <legend className="text-cf-lg font-black text-ink">{legend}</legend>
      {description && <p className="mt-cf-2 max-w-3xl text-cf-sm text-ink-muted">{description}</p>}
      <div className="mt-cf-4 grid gap-cf-4 md:grid-cols-2">
        {roles.map((role) => {
          const inputId = `${name}-${role.id}`
          const nameId = `${inputId}-name`
          const descriptionId = `${inputId}-description`
          const permissionsId = `${inputId}-permissions`

          return (
            <div key={role.id} className="relative">
              <input
                id={inputId}
                type="radio"
                name={name}
                value={role.id}
                checked={value === role.id}
                onChange={() => onChange(role.id)}
                aria-labelledby={nameId}
                aria-describedby={`${descriptionId} ${permissionsId}`}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={cn(
                  'block h-full cursor-pointer rounded-cf-md border-3 border-strong-border bg-surface p-cf-4 text-ink shadow-brutal-sm',
                  'transition-[transform,box-shadow,background-color] duration-fast hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal',
                  'peer-focus-visible:shadow-focus peer-disabled:cursor-not-allowed peer-disabled:bg-disabled',
                  value === role.id && 'bg-action shadow-brutal',
                )}
              >
                <span className="flex items-center justify-between gap-cf-3">
                  <span id={nameId} className="text-cf-md font-black">{role.name}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border-3 border-strong-border bg-surface',
                      value === role.id && 'bg-accent text-accent-ink',
                    )}
                  >
                    {value === role.id ? '✓' : ''}
                  </span>
                </span>
                <span id={descriptionId} className="mt-cf-2 block text-cf-sm text-ink-muted">
                  {role.description}
                </span>
                <span id={permissionsId} className="mt-cf-4 grid gap-cf-3 text-cf-xs sm:grid-cols-2">
                  <span>
                    <span className="block font-black uppercase tracking-wide text-success">Allowed</span>
                    <span className="mt-cf-1 block space-y-cf-1">
                      {role.allowedActions.map((action) => (
                        <span key={action} className="block">✓ {action}</span>
                      ))}
                    </span>
                  </span>
                  <span>
                    <span className="block font-black uppercase tracking-wide text-danger">Restricted</span>
                    <span className="mt-cf-1 block space-y-cf-1">
                      {role.restrictions.map((restriction) => (
                        <span key={restriction} className="block">× {restriction}</span>
                      ))}
                    </span>
                  </span>
                </span>
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
