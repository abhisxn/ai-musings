export type ExperimentType = 'react' | 'iframe'
export type ExperimentStatus = 'live' | 'wip' | 'archived'

export interface CaseStudyParagraph {
  lead?: string
  text: string
}

export interface CaseStudyListItem {
  lead: string
  text: string
}

export interface CaseStudyContent {
  about: CaseStudyParagraph[]
  exploring: CaseStudyParagraph[]
  learnings: CaseStudyParagraph[]
  innerWorkings: CaseStudyParagraph[]
  howTo: {
    intro: string
    items: CaseStudyListItem[]
  }
  expectations: CaseStudyParagraph[]
  versions: CaseStudyListItem[]
}

export interface ExperimentMeta {
  slug: string
  title: string
  description: string
  summary: string        // one-sentence gallery-card subcopy
  date: string           // ISO date e.g. "2026-04-30"
  type: ExperimentType
  status: ExperimentStatus
  tags: string[]
  series?: string
  thumbnail: string      // path relative to /public, 4:3, e.g. "/experiments/threshold/thumbnail.svg"
  hero: string           // path relative to /public, 21:6, e.g. "/experiments/threshold/hero.svg"
  caseStudy: CaseStudyContent
  iframeSrc?: string     // required when type === 'iframe', e.g. "/musings/threshold/embed"
}
