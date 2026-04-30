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
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6 p-4 border border-zinc-900/50 bg-void-dark/50 backdrop-blur-sm relative">
        <div className="absolute -top-2 left-4 px-2 bg-void-black text-[8px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
          Filter_Module
        </div>
        
        {series.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest w-16">_series</span>
            <div className="flex flex-wrap gap-2">
              {series.map(s => (
                <Badge
                  key={s}
                  label={s}
                  active={activeSeries === s}
                  onClick={() => setActiveSeries(activeSeries === s ? null : s)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest w-16">_tags</span>
          <div className="flex flex-wrap gap-2">
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
      </div>

      {filtered.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-zinc-900 gap-4">
          <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-[0.3em]">No_Matching_Artifacts_Found</p>
          <button 
            onClick={() => { setActiveTag(null); setActiveSeries(null); }}
            className="text-[9px] text-neon-green/50 hover:text-neon-green transition-colors font-mono"
          >
            [ RESET_FILTERS ]
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(e => (
          <ExperimentCard key={e.slug} experiment={e} />
        ))}
      </div>
    </div>
  )
}
