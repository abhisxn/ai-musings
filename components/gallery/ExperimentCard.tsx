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
      <Card className="h-full flex flex-col gap-4 group overflow-hidden">
        {experiment.thumbnail && (
          <div className="relative aspect-video bg-zinc-950 overflow-hidden border border-zinc-900 group-hover:border-neon-green/30 transition-colors">
            <img
              src={experiment.thumbnail}
              alt={experiment.title}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
            <div className="absolute top-2 left-2 text-[8px] font-mono text-neon-green/40 group-hover:text-neon-green/80 transition-colors">
              IMG_DATA_0x{Math.random().toString(16).slice(2, 6).toUpperCase()}
            </div>
          </div>
        )}
        {!experiment.thumbnail && (
          <div className="aspect-video bg-zinc-950 flex flex-col items-center justify-center border border-zinc-900 group-hover:border-neon-green/30 transition-colors gap-2">
            <div className="text-[10px] font-mono text-zinc-800">[ NO_VISUAL_DATA ]</div>
            <div className="w-12 h-[1px] bg-zinc-900 group-hover:bg-neon-green/20" />
          </div>
        )}
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-mono text-zinc-100 glitch-text tracking-tight uppercase group-hover:text-neon-green transition-colors">
              {experiment.title}
            </h2>
            <div className="text-[9px] font-mono text-zinc-600">
              ID: {experiment.slug.toUpperCase()}
            </div>
          </div>
          
          <p className="text-[11px] text-zinc-500 leading-relaxed flex-1 font-mono tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
            {experiment.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-auto pt-4 border-t border-zinc-900/50">
            {experiment.series && (
              <Badge label={experiment.series} active />
            )}
            {experiment.tags.map(tag => (
              <Badge key={tag} label={tag} />
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center text-[9px] text-zinc-700 font-mono pt-2">
          <span>{experiment.date}</span>
          <span className="group-hover:text-neon-green/50 transition-colors">[{experiment.status.toUpperCase()}]</span>
        </div>
      </Card>
    </Link>
  )
}
