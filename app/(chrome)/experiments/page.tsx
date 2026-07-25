'use client'

import { motion } from 'framer-motion'
import { getAllExperiments, getAllTags, getAllSeries } from '@/lib/experiments'
import { fadeUp } from '@/lib/motion'
import { ExperimentGrid } from '@/components/gallery/ExperimentGrid'

export default function ExperimentsPage() {
  const experiments = getAllExperiments()
  const tags = getAllTags()
  const series = getAllSeries()

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <motion.header
        className="mb-16 font-display"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <h1 className="t-display text-fg">AI Musings</h1>
        <p className="t-body1 text-secondary mt-4 max-w-2xl">
          A running notebook of AI + creative experiments.
        </p>
      </motion.header>
      <ExperimentGrid experiments={experiments} tags={tags} series={series} />
    </div>
  )
}
