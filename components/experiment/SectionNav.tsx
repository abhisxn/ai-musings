'use client'

import { useEffect, useState } from 'react'
import { CASE_STUDY_SECTIONS } from './caseStudySections'

export function SectionNav() {
  const [activeId, setActiveId] = useState<string>(CASE_STUDY_SECTIONS[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    const elements = CASE_STUDY_SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <ul className="flex flex-col gap-1 t-body3">
      {CASE_STUDY_SECTIONS.map(({ id, label }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className={`block py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-btn ${
              activeId === id ? 'text-accent' : 'text-fg/60 hover:text-fg'
            }`}
          >
            → {label}
          </a>
        </li>
      ))}
    </ul>
  )
}
