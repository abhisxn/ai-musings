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
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/experiments" className="text-xs text-zinc-600 hover:text-zinc-300 font-mono transition-colors">
            ← musings
          </Link>
          <h1 className="text-sm font-mono text-zinc-200">{meta.title}</h1>
        </div>
        <div className="flex gap-1">
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
