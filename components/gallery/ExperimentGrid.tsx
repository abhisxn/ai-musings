'use client'

import { useState } from 'react'
import { ExperimentMeta } from '@/lib/types'
import { ExperimentCard } from './ExperimentCard'
import { Badge } from '@/components/ui/Badge'

interface ExperimentGridProps {
  experiments: ExperimentMeta[]
  tags: string[]
  series: string[]
}

export function ExperimentGrid({ experiments, tags, series }: ExperimentGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)

  const filtered = experiments.filter(e => {
    const tagMatch = !activeTag || e.tags.includes(activeTag)
    const seriesMatch = !activeSeries || e.series === activeSeries
    return tagMatch && seriesMatch
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {series.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-600 font-mono w-14">series</span>
            {series.map(s => (
              <Badge
                key={s}
                label={s}
                active={activeSeries === s}
                onClick={() => setActiveSeries(activeSeries === s ? null : s)}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-600 font-mono w-14">tags</span>
          {tags.map(t => (
            <Badge
              key={t}
              label={t}
              active={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-zinc-600 text-sm font-mono">no experiments match this filter.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(e => (
          <ExperimentCard key={e.slug} experiment={e} />
        ))}
      </div>
    </div>
  )
}
