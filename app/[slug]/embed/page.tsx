import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentView } from '@/components/experiment/ExperimentView'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ExperimentEmbedPage({ params }: Props) {
  const { slug } = await params
  const meta = getExperimentBySlug(slug)
  if (!meta) notFound()

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ExperimentView meta={meta} />
    </div>
  )
}
