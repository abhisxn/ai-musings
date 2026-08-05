import Link from 'next/link'
import Image from 'next/image'
import { ExperimentMeta, CaseStudyParagraph } from '@/lib/types'
import { assetPath } from '@/lib/assetPath'
import { SectionNav } from './SectionNav'
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
        <p key={i} className="t-body1 text-fg/80">
          {item.lead && <strong className="text-fg">{item.lead} </strong>}
          {item.text}
        </p>
      ))}
    </div>
  )
}

export function CaseStudyLayout({ meta }: CaseStudyLayoutProps) {
  const cs = meta.caseStudy
  const eyebrow = meta.series ? `${meta.series} · ${statusLabel[meta.status]}` : statusLabel[meta.status]
  const Diagram = diagramsBySlug[meta.slug]

  return (
    <article className="max-w-6xl mx-auto px-4 pb-24">
      <div className="relative w-full aspect-[21/6] rounded-card overflow-hidden mb-10 bg-surface-3">
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

      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-[30%] md:sticky md:top-28 md:self-start flex flex-col gap-4 h-fit">
          <p className="t-caption text-fg/50 uppercase tracking-wide">{eyebrow}</p>
          <h1 className="t-h1 text-fg">{meta.title}</h1>
          <SectionNav />
        </aside>

        <div className="md:w-[70%] flex flex-col gap-14">
          <section id="about" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">About</h2>
            <Paragraphs items={cs.about} />
          </section>

          <section id="exploring" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">What Was I Exploring</h2>
            <Paragraphs items={cs.exploring} />
          </section>

          <section id="learnings" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Key Learnings</h2>
            <Paragraphs items={cs.learnings} />
          </section>

          <section id="inner-workings" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Inner Workings</h2>
            {Diagram && <Diagram />}
            <Paragraphs items={cs.innerWorkings} />
          </section>

          <section id="how-to" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">How To</h2>
            <p className="t-body1 text-fg/80">{cs.howTo.intro}</p>
            <ul className="flex flex-col gap-3">
              {cs.howTo.items.map((item, i) => (
                <li key={i} className="t-body1 text-fg/80">
                  <strong className="text-fg">{item.lead}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section id="expectations" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Expectations</h2>
            <Paragraphs items={cs.expectations} />
          </section>

          <section id="versions" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Versions</h2>
            <ul className="flex flex-col gap-4">
              {cs.versions.map((v, i) => (
                <li key={i} className="t-body1 text-fg/80">
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
