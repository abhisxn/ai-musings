import Link from 'next/link'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

interface ExperimentLayoutProps {
  meta: ExperimentMeta
  children: React.ReactNode
  embed?: boolean
}

export function ExperimentLayout({ meta, children, embed = false }: ExperimentLayoutProps) {
  if (embed) {
    return <div className="w-screen h-screen overflow-hidden">{children}</div>
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 sm:px-6 pt-6 pb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-1">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <Link
            href="/experiments"
            className="inline-flex items-center gap-1.5 bg-surface-1 border border-border-1 rounded-pill px-3 py-1.5 text-sm text-fg hover:bg-surface-2 hover:border-border-2 transition-colors duration-200 shrink-0"
          >
            <span aria-hidden>←</span>
            <span>All experiments</span>
          </Link>
          <h1 className="t-h4 text-fg">{meta.title}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {meta.tags.map(tag => (
            <Badge key={tag} label={tag} />
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
