import { HTMLAttributes } from 'react'
import { cn } from './cn'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  muted?: boolean
}

export function Panel({ muted = false, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'cf-ui rounded-cf-md border-3 border-strong-border p-cf-4 text-ink shadow-brutal',
        muted ? 'bg-surface-muted' : 'bg-surface',
        className,
      )}
      {...props}
    />
  )
}
