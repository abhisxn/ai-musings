import { getAllExperiments, getAllTags, getAllSeries } from '@/lib/experiments'
import { ExperimentGrid } from '@/components/gallery/ExperimentGrid'

export default function ExperimentsPage() {
  const experiments = getAllExperiments()
  const tags = getAllTags()
  const series = getAllSeries()

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-lg font-mono text-zinc-200 mb-1">AI Musings</h1>
        <p className="text-xs text-zinc-600 font-mono">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
        </p>
      </header>
      <ExperimentGrid experiments={experiments} tags={tags} series={series} />
    </div>
  )
}
