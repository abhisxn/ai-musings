'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExperimentMeta } from '@/lib/types'
import { assetPath } from '@/lib/assetPath'
import { Tag } from '@/components/ui/Tag'

const MAX_CARD_TAGS = 3

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'WIP',
  archived: 'Archived',
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  // Spec mirrors thatguyabhishek Card size "l" (the grid size; our cards are ~520px wide like its
  // 520px imgSizes): 24px radius, 3:2 image that insets on hover, gap-4 / px-6 pt-5 pb-8 content,
  // t-h4 title, t-body2 (18px) description, 14px link CTA.
  return (
    <Link
      href={`/${experiment.slug}`}
      className="group flex flex-col h-full overflow-hidden rounded-[24px] bg-surface-inverse text-ink shadow-md no-underline transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="w-full shrink-0 overflow-hidden transition-[padding] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:pt-3 group-hover:px-3">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-[20px] transition-[border-radius] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rounded-[20px]">
          <Image
            src={assetPath(experiment.thumbnail)}
            alt={experiment.title}
            fill
            className="object-cover transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      <div className="flex flex-col items-start flex-1 gap-4 px-6 pt-5 pb-8">
        <div className="flex flex-nowrap gap-1 w-full overflow-hidden">
          <Tag label={statusLabel[experiment.status]} />
          {experiment.tags.slice(0, MAX_CARD_TAGS).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full">
          <h2 className="t-h4 w-full text-ink line-clamp-2">{experiment.cardTitle ?? experiment.title}</h2>
          <p className="t-body2 w-full text-ink/70 leading-[1.4] line-clamp-4 min-h-[4lh]">{experiment.cardSummary ?? experiment.summary}</p>
        </div>

        <span className="mt-auto pt-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider leading-none text-ink transition-colors duration-200 group-hover:text-coral">
          Know more
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1.5 10.5L10.5 1.5M10.5 1.5H4.5M10.5 1.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
