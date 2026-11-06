import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from './cn'

interface FieldFrameProps {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  children: ReactNode
}

function FieldFrame({ id, label, description, error, required, children }: FieldFrameProps) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="cf-ui space-y-cf-2">
      <label htmlFor={id} className="block text-cf-sm font-extrabold text-ink">
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {description && (
        <p id={descriptionId} className="text-cf-xs text-ink-muted">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} className="flex gap-cf-2 text-cf-xs font-bold text-danger" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  )
}

const controlClasses = cn(
  'w-full rounded-cf-sm border-3 border-strong-border bg-surface px-cf-3 py-cf-2 text-cf-sm text-ink shadow-brutal-sm',
  'placeholder:text-ink-muted transition-[box-shadow,transform,background-color] duration-fast',
  'hover:bg-canvas focus-visible:outline-none focus-visible:shadow-focus',
  'disabled:cursor-not-allowed disabled:border-disabled-ink disabled:bg-disabled disabled:text-disabled-ink disabled:shadow-none',
)

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  description?: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, description, error, required, className, ...props },
  ref,
) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <FieldFrame id={id} label={label} description={description} error={error} required={required}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(controlClasses, error && 'border-danger bg-danger-surface', className)}
        {...props}
      />
    </FieldFrame>
  )
})

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  description?: string
  error?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id, label, description, error, required, className, children, ...props },
  ref,
) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <FieldFrame id={id} label={label} description={description} error={error} required={required}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(controlClasses, error && 'border-danger bg-danger-surface', className)}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  )
})

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label: string
  description?: string
  error?: string
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { id, label, description, error, required, className, ...props },
  ref,
) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <FieldFrame id={id} label={label} description={description} error={error} required={required}>
      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(controlClasses, 'min-h-28 resize-y', error && 'border-danger bg-danger-surface', className)}
        {...props}
      />
    </FieldFrame>
  )
})
