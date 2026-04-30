import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'your-slug-here',       // kebab-case
  title: 'Experiment Title',
  description: 'One sentence description.',
  date: '2026-01-01',           // ISO date
  type: 'react',                // 'react' | 'iframe'
  status: 'wip',                // 'live' | 'wip' | 'archived'
  tags: ['tag-one', 'tag-two'],
  series: undefined,            // optional series name
  // iframeSrc: '/experiments/your-slug/index.html', // required if type === 'iframe'
}

export default meta
