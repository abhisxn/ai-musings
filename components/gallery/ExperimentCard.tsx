'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'In progress',
  archived: 'Archived',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const cardVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
}

const imageVariants = {
  rest: { opacity: 0.85, scale: 1.02 },
  hover: { opacity: 1, scale: 1.06, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link href={`/experiments/${experiment.slug}`} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-card">
      <motion.div
        className="h-full"
        initial="rest"
        whileHover="hover"
        variants={cardVariants}
        whileTap={{ scale: 0.99 }}
      >
        <Card className="h-full flex flex-col gap-4 overflow-hidden">
          {experiment.thumbnail ? (
            <div className="relative aspect-video overflow-hidden rounded-[calc(var(--radius-card)-0.75rem)] bg-surface-3">
              <motion.img
                src={experiment.thumbnail}
                alt={experiment.title}
                className="w-full h-full object-cover"
                variants={imageVariants}
              />
            </div>
          ) : (
            <div className="aspect-video rounded-[calc(var(--radius-card)-0.75rem)] bg-surface-3 ring-1 ring-border-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="t-caption text-fg/40">No preview available</span>
              <span className="t-body3 text-fg/30 max-w-xs">
                This experiment doesn&rsquo;t ship a thumbnail yet.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 flex-1">
            <div className="flex flex-col gap-2">
              <h2 className="t-h5 text-fg">
                {experiment.title}
              </h2>
              <p className="t-body3 text-fg/70 leading-relaxed flex-1">
                {experiment.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-border-1">
              {experiment.series && (
                <Badge label={experiment.series} active />
              )}
              {experiment.tags.map(tag => (
                <Badge key={tag} label={tag} />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center t-caption text-fg/50 pt-2">
            <time dateTime={experiment.date}>{formatDate(experiment.date)}</time>
            <span>{statusLabel[experiment.status]}</span>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}
