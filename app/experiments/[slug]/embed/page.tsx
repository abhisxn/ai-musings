import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentFrame } from '@/components/experiment/ExperimentFrame'

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
      {meta.type === 'iframe' && meta.iframeSrc ? (
        <ExperimentFrame src={meta.iframeSrc} title={meta.title} />
      ) : (
        <div className="flex items-center justify-center h-full text-fg/60 t-body3">
          [ react component not yet connected ]
        </div>
      )}
    </div>
  )
}
