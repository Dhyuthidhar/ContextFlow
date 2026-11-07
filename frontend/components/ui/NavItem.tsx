import Link, { LinkProps } from 'next/link'
import { AnchorHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface NavItemProps extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  active?: boolean
  icon?: ReactNode
}

export function NavItem({ active = false, icon, className, children, ...props }: NavItemProps) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'cf-ui inline-flex min-h-11 items-center gap-cf-2 rounded-cf-sm border-2 border-transparent px-cf-3 py-cf-2 text-cf-sm font-extrabold text-ink',
        'transition-colors duration-fast hover:border-strong-border hover:bg-action',
        'focus-visible:outline-none focus-visible:shadow-focus',
        active && 'border-strong-border bg-action shadow-brutal-sm',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  )
}
