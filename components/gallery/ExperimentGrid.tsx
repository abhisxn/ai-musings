'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExperimentMeta } from '@/lib/types'
import { ExperimentCard } from './ExperimentCard'
import { Badge } from '@/components/ui/Badge'
import { fadeUp, stagger, viewport } from '@/lib/motion'

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

  const hasFilters = tags.length > 0 || series.length > 0

  return (
    <div className="flex flex-col gap-12">
      {hasFilters && (
        <div className="flex flex-col gap-5 p-5 ring-1 ring-border-1 bg-surface-1 rounded-card">
          {series.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="t-caption text-fg/50 w-20 shrink-0">Series</span>
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
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="t-caption text-fg/50 w-20 shrink-0">Tags</span>
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
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
          <p className="t-h5 text-fg/60">No experiments match your filters</p>
          <p className="t-body3 text-fg/40 max-w-sm">
            Try clearing one of the active tags or series to see more work.
          </p>
          <button
            type="button"
            onClick={() => { setActiveTag(null); setActiveSeries(null); }}
            className="t-caption text-accent hover:opacity-80 transition-opacity"
          >
            Reset filters
          </button>
        </div>
      ) : filtered.length === 1 ? (
        <motion.div
          className="grid grid-cols-1"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <ExperimentCard experiment={filtered[0]} />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(0,1fr)] gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          {filtered.map((e, i) => (
            <motion.div
              key={e.slug}
              variants={fadeUp}
              className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''}
            >
              <ExperimentCard experiment={e} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
