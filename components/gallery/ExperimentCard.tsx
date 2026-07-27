'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ExperimentMeta } from '@/lib/types'
import { assetPath } from '@/lib/assetPath'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'WIP',
  archived: 'Archived',
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
    <Link
      href={`/${experiment.slug}`}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-card"
    >
      <motion.div
        className="h-full"
        initial="rest"
        whileHover="hover"
        variants={cardVariants}
        whileTap={{ scale: 0.99 }}
      >
        <Card className="h-full" contentClassName="p-0">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
            <motion.div
              className="w-full h-full"
              variants={imageVariants}
            >
              <Image
                src={assetPath(experiment.thumbnail)}
                alt={experiment.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
          </div>

          <div className="flex flex-col gap-2.5 p-5">
            <div className="flex flex-wrap gap-1.5">
              {experiment.series && <Badge label={experiment.series} active />}
              <Badge label={statusLabel[experiment.status]} />
            </div>
            <h2 className="t-h5 text-fg">{experiment.title}</h2>
            <p className="t-body3 text-fg/70 leading-relaxed">{experiment.summary}</p>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}
