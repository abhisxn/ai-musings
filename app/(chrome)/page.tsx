'use client'

import { motion } from 'framer-motion'
import { getAllExperiments, getAllTags } from '@/lib/experiments'
import { fadeUp } from '@/lib/motion'
import { ExperimentGrid } from '@/components/gallery/ExperimentGrid'

export default function ExperimentsPage() {
  const experiments = getAllExperiments()
  const tags = getAllTags()

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16">
      <motion.header
        className="pb-12 sm:pb-16 lg:pb-20 border-b border-border-1"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <p className="t-caption text-fg/50">Notebook</p>
        <h1 className="t-display text-fg mt-3">AI Musings</h1>
        <p className="t-body1 text-fg/70 mt-4 max-w-2xl">
          A running notebook of AI + creative experiments.
        </p>
      </motion.header>
      <div className="py-12 sm:py-16">
        <ExperimentGrid experiments={experiments} tags={tags} />
      </div>
    </div>
  )
}
