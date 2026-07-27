import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'your-slug-here',       // kebab-case
  title: 'Experiment Title',
  description: 'One sentence description.',
  summary: '',                 // one-sentence gallery-card subcopy
  date: '2026-01-01',          // ISO date
  type: 'react',               // 'react' | 'iframe'
  status: 'wip',               // 'live' | 'wip' | 'archived'
  tags: ['tag-one', 'tag-two'],
  series: undefined,           // optional series name
  thumbnail: '',               // path relative to /public, 4:3
  hero: '',                    // path relative to /public, 21:6
  caseStudy: {
    about: [{ text: '' }],
    exploring: [{ text: '' }],
    learnings: [{ text: '' }],
    innerWorkings: [{ text: '' }],
    howTo: { intro: '', items: [{ lead: '', text: '' }] },
    expectations: [{ text: '' }],
    versions: [{ lead: '', text: '' }],
  },
  // iframeSrc: '/musings/experiments/your-slug/index.html', // required if type === 'iframe'
}

export default meta
