'use client'

import dynamic from 'next/dynamic'
import { ExperimentFrame } from './ExperimentFrame'
import { ExperimentMeta } from '@/lib/types'

// Dynamically import React experiments with SSR disabled
const Threshold = dynamic(() => import('../../experiments/threshold/index'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-fg/60 t-caption animate-pulse">Loading experiment…</div>
})

const DeckContentLab = dynamic(() => import('../../experiments/deck-content-lab/index'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-fg/60 t-caption animate-pulse">Loading experiment…</div>
})

const ChartsStudio = dynamic(() => import('../../experiments/charts-studio/index'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-fg/60 t-caption animate-pulse">Loading experiment…</div>
})

const GutterGeneration = dynamic(() => import('../../experiments/gutter-generation/index'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-fg/60 t-caption animate-pulse">Loading experiment…</div>
})

interface Props {
  meta: ExperimentMeta
}

export function ExperimentView({ meta }: Props) {
  if (meta.type === 'iframe' && meta.iframeSrc) {
    return <ExperimentFrame src={meta.iframeSrc} title={meta.title} />
  }

  if (meta.slug === 'threshold') {
    return <Threshold />
  }

  if (meta.slug === 'deck-content-lab') {
    return <DeckContentLab />
  }

  if (meta.slug === 'charts-studio') {
    return <ChartsStudio />
  }

  if (meta.slug === 'gutter-generation') {
    return <GutterGeneration />
  }

  return (
      <div className="flex items-center justify-center h-full text-fg/60 t-body3">
      [ experiment component "{meta.slug}" not yet connected ]
    </div>
  )
}
