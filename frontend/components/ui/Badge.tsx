import { HTMLAttributes } from 'react'
import { cn } from './cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink',
  accent: 'bg-accent text-accent-ink',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'cf-ui inline-flex min-h-7 items-center rounded-cf-sm border-2 border-strong-border px-cf-2 py-cf-1 font-mono text-cf-xs font-bold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
