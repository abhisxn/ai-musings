import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentLayout } from '@/components/experiment/ExperimentLayout'
import { ExperimentView } from '@/components/experiment/ExperimentView'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ExperimentPage({ params }: Props) {
  const { slug } = await params
  const meta = getExperimentBySlug(slug)
  if (!meta) notFound()

  return (
    <ExperimentLayout meta={meta}>
      <ExperimentView meta={meta} />
    </ExperimentLayout>
  )
}
