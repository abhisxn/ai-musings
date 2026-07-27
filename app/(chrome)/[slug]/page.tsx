import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { CaseStudyLayout } from '@/components/experiment/CaseStudyLayout'

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

  return <CaseStudyLayout meta={meta} />
}
