import { getAllExperiments, getAllTags, getAllSeries } from '@/lib/experiments'
import { ExperimentGrid } from '@/components/gallery/ExperimentGrid'

export default function ExperimentsPage() {
  const experiments = getAllExperiments()
  const tags = getAllTags()
  const series = getAllSeries()

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <header className="mb-16 relative">
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-xl font-mono text-white tracking-widest uppercase glitch-text">
            AI.MUSINGS.INF
          </h1>
          <span className="text-[10px] text-neon-green animate-pulse">REC ●</span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-neon-green/50 via-zinc-800 to-transparent mb-4" />
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          <div>SYSTEM_STATUS: STABLE // ARCHIVE_COUNT: {experiments.length.toString().padStart(3, '0')}</div>
          <div className="hidden sm:block">LOCAL_TIME: {new Date().toLocaleTimeString()}</div>
        </div>
      </header>
      <ExperimentGrid experiments={experiments} tags={tags} series={series} />
    </div>
  )
}
