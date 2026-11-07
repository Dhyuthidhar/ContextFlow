import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'
export type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-action text-ink hover:bg-action-hover',
  secondary: 'bg-accent text-accent-ink hover:bg-ink',
  danger: 'bg-danger text-white hover:bg-ink',
  quiet: 'bg-surface text-ink hover:bg-surface-muted',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-cf-3 py-cf-2 text-cf-xs',
  md: 'min-h-11 px-cf-4 py-cf-2 text-cf-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'cf-ui inline-flex items-center justify-center gap-cf-2 rounded-cf-sm border-3 border-strong-border font-extrabold shadow-brutal-sm',
        'transition-[transform,box-shadow,background-color] duration-fast',
        'hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:border-disabled-ink disabled:bg-disabled disabled:text-disabled-ink disabled:shadow-none disabled:transform-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  )
})
