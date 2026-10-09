import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}

/** Großer Seitentitel im iOS-Stil. */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-4 pt-4">
      <div className="min-w-0">
        {subtitle && <p className="mb-0.5 text-[13px] font-medium text-ink-2">{subtitle}</p>}
        <h1 className="truncate font-display text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
