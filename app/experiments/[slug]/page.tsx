import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentLayout } from '@/components/experiment/ExperimentLayout'
import { ExperimentFrame } from '@/components/experiment/ExperimentFrame'

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
      {meta.type === 'iframe' && meta.iframeSrc ? (
        <ExperimentFrame src={meta.iframeSrc} title={meta.title} />
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
          [ react component not yet connected ]
        </div>
      )}
    </ExperimentLayout>
  )
}
