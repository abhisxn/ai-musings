import Link from 'next/link'
import Image from 'next/image'
import { ExperimentMeta, CaseStudyParagraph } from '@/lib/types'
import { assetPath } from '@/lib/assetPath'
import { Tag } from '@/components/ui/Tag'
import { SectionNav } from './SectionNav'
import { CASE_STUDY_SECTIONS } from './caseStudySections'
import { PipelineDiagram } from '../../experiments/deck-content-lab/PipelineDiagram'

const diagramsBySlug: Record<string, React.ComponentType> = {
  'deck-content-lab': PipelineDiagram,
}

interface CaseStudyLayoutProps {
  meta: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'WIP',
  archived: 'Archived',
}

function Paragraphs({ items }: { items: CaseStudyParagraph[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <p key={i} className="t-body1 text-fg/70">
          {item.lead && <strong className="text-fg">{item.lead} </strong>}
          {item.text}
        </p>
      ))}
    </div>
  )
}

function sectionIndex(id: string): string {
  const i = CASE_STUDY_SECTIONS.findIndex((s) => s.id === id)
  return String(i + 1).padStart(2, '0')
}

function SectionHeading({ id }: { id: string }) {
  const section = CASE_STUDY_SECTIONS.find((s) => s.id === id)
  return (
    <h2 className="t-h3 text-fg flex items-baseline gap-3">
      <span className="t-caption text-fg/30 font-normal">{sectionIndex(id)}</span>
      {section?.label}
    </h2>
  )
}

export function CaseStudyLayout({ meta }: CaseStudyLayoutProps) {
  const cs = meta.caseStudy
  const eyebrow = meta.series ? `${meta.series} · ${statusLabel[meta.status]}` : statusLabel[meta.status]
  const Diagram = diagramsBySlug[meta.slug]

  return (
    <article className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16 pb-24">
      <div className="relative w-full aspect-[21/6] rounded-card overflow-hidden mb-12 bg-surface-3">
        <Image src={assetPath(meta.hero)} alt={meta.title} fill className="object-cover" sizes="100vw" priority />
        <Link
          href={`/${meta.slug}/embed`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-accent text-on-accent t-body3 font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Launch {meta.title} ↗
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
        <aside className="md:w-[30%] md:sticky md:top-28 md:self-start flex flex-col gap-5 h-fit">
          <p className="t-caption text-fg/50 uppercase tracking-wide">{eyebrow}</p>
          <h1 className="t-h1 text-fg">{meta.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
          <Link
            href={`/${meta.slug}/embed`}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-accent text-on-accent t-body3 font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Launch {meta.title} ↗
          </Link>
          <div className="pt-2 border-t border-border-1">
            <SectionNav />
          </div>
        </aside>

        <div className="md:w-[70%] flex flex-col">
          <section id="about" className="flex flex-col gap-4 pb-10">
            <SectionHeading id="about" />
            <Paragraphs items={cs.about} />
          </section>

          <section id="exploring" className="flex flex-col gap-4 py-10 border-t border-border-1">
            <SectionHeading id="exploring" />
            <Paragraphs items={cs.exploring} />
          </section>

          <section id="learnings" className="flex flex-col gap-4 py-10 border-t border-border-1">
            <SectionHeading id="learnings" />
            <Paragraphs items={cs.learnings} />
          </section>

          <section id="inner-workings" className="flex flex-col gap-4 py-10 border-t border-border-1">
            <SectionHeading id="inner-workings" />
            {Diagram && <Diagram />}
            <Paragraphs items={cs.innerWorkings} />
          </section>

          <section id="how-to" className="flex flex-col gap-4 py-10 border-t border-border-1">
            <SectionHeading id="how-to" />
            <p className="t-body1 text-fg/70">{cs.howTo.intro}</p>
            <ul className="flex flex-col gap-3">
              {cs.howTo.items.map((item, i) => (
                <li key={i} className="t-body1 text-fg/70">
                  <strong className="text-fg">{item.lead}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section id="expectations" className="flex flex-col gap-4 py-10 border-t border-border-1">
            <SectionHeading id="expectations" />
            <Paragraphs items={cs.expectations} />
          </section>

          <section id="versions" className="flex flex-col gap-4 pt-10 border-t border-border-1">
            <SectionHeading id="versions" />
            <ul className="flex flex-col gap-4">
              {cs.versions.map((v, i) => (
                <li key={i} className="t-body1 text-fg/70">
                  <strong className="text-fg">{v.lead}</strong> {v.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>
  )
}
