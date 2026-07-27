import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { CaseStudyLayout } from './CaseStudyLayout'
import { CASE_STUDY_SECTIONS } from './caseStudySections'
import thresholdMeta from '@/experiments/threshold/meta'

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  ;(globalThis as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
    MockIntersectionObserver
})

describe('CaseStudyLayout', () => {
  it('renders the hero banner with the experiment title as alt text', () => {
    render(<CaseStudyLayout meta={thresholdMeta} />)
    const hero = screen.getByAltText(thresholdMeta.title)
    expect(hero).toBeInTheDocument()
    expect(hero.tagName).toBe('IMG')
  })

  it('renders a Launch link pointing to /threshold/embed in a new tab', () => {
    render(<CaseStudyLayout meta={thresholdMeta} />)
    const launch = screen.getByRole('link', { name: /launch/i })
    expect(launch).toHaveAttribute('href', '/threshold/embed')
    expect(launch).toHaveAttribute('target', '_blank')
  })

  it('renders all 7 section headings', () => {
    render(<CaseStudyLayout meta={thresholdMeta} />)
    for (const section of CASE_STUDY_SECTIONS) {
      expect(screen.getByRole('heading', { level: 2, name: section.label })).toBeInTheDocument()
    }
  })

  it('renders the SectionNav with all 7 expected labels', () => {
    render(<CaseStudyLayout meta={thresholdMeta} />)
    for (const { label } of CASE_STUDY_SECTIONS) {
      expect(screen.getByText(`→ ${label}`)).toBeInTheDocument()
    }
  })
})
