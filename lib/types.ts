export type ExperimentType = 'react' | 'iframe'
export type ExperimentStatus = 'live' | 'wip' | 'archived'

export interface ExperimentMeta {
  slug: string
  title: string
  description: string
  date: string           // ISO date e.g. "2026-04-30"
  type: ExperimentType
  status: ExperimentStatus
  tags: string[]
  series?: string
  thumbnail?: string     // path relative to /public e.g. "/experiments/threshold/thumb.jpg"
  iframeSrc?: string     // required when type === 'iframe', e.g. "/musings/experiments/threshold/threshold.html"
}
