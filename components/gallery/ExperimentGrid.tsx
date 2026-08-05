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
}

export function ExperimentGrid({ experiments, tags }: ExperimentGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = experiments.filter(e => {
    const tagMatch = !activeTag || e.tags.includes(activeTag)
    return tagMatch
  })

  const tagCounts = experiments.reduce<Record<string, number>>((acc, e) => {
    for (const t of e.tags) acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})
  const sortedTags = [...tags].sort((a, b) => {
    const byCount = (tagCounts[b] ?? 0) - (tagCounts[a] ?? 0)
    return byCount !== 0 ? byCount : a.localeCompare(b)
  })

  const hasFilters = tags.length > 0

  return (
    <div className="flex flex-col gap-10">
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-3 pb-8 border-b border-border-1">
          <span className="t-caption text-fg/40">Filter</span>
          <div className="flex flex-wrap gap-2">
            {sortedTags.map(t => (
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

      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
          <p className="t-h5 text-fg/60">No experiments match your filters</p>
          <p className="t-body3 text-fg/40 max-w-sm">
            Try clearing one of the active tags to see more work.
          </p>
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="t-caption text-accent hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-card"
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
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          {filtered.map((e) => (
            <motion.div key={e.slug} variants={fadeUp}>
              <ExperimentCard experiment={e} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
