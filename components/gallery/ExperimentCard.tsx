import Link from 'next/link'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link href={`/experiments/${experiment.slug}`}>
      <Card className="h-full flex flex-col gap-3 group">
        {experiment.thumbnail && (
          <div className="aspect-video bg-zinc-900 overflow-hidden">
            <img
              src={experiment.thumbnail}
              alt={experiment.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        {!experiment.thumbnail && (
          <div className="aspect-video bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">
            [ no preview ]
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1">
          <h2 className="text-sm font-mono text-zinc-100 group-hover:text-green-400 transition-colors">
            {experiment.title}
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed flex-1">
            {experiment.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {experiment.series && (
              <Badge label={`series: ${experiment.series}`} />
            )}
            {experiment.tags.map(tag => (
              <Badge key={tag} label={tag} />
            ))}
          </div>
        </div>
        <div className="text-xs text-zinc-700 font-mono">
          {experiment.date} · {experiment.status}
        </div>
      </Card>
    </Link>
  )
}
