import { ExperimentMeta } from './types'

// Import all meta files explicitly — Next.js static export requires static imports
import thresholdMeta from '@/content/experiments/threshold/meta'

const registry: ExperimentMeta[] = [
  thresholdMeta,
]

export function getAllExperiments(): ExperimentMeta[] {
  return registry.filter(e => e.status !== 'archived')
}

export function getExperimentBySlug(slug: string): ExperimentMeta | undefined {
  return registry.find(e => e.slug === slug)
}

export function getAllTags(): string[] {
  const tags = registry.flatMap(e => e.tags)
  return [...new Set(tags)].sort()
}

export function getAllSeries(): string[] {
  const series = registry.map(e => e.series).filter(Boolean) as string[]
  return [...new Set(series)].sort()
}
