'use client'

import dynamic from 'next/dynamic'
import { ExperimentFrame } from './ExperimentFrame'
import { ExperimentMeta } from '@/lib/types'

// Dynamically import React experiments with SSR disabled
const Threshold = dynamic(() => import('../../experiments/threshold/index'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-zinc-600 text-xs font-mono animate-pulse">LOADING EXPERIMENT...</div>
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

  return (
    <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
      [ experiment component "{meta.slug}" not yet connected ]
    </div>
  )
}
