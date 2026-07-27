import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { SectionNav } from './SectionNav'
import { CASE_STUDY_SECTIONS } from './caseStudySections'

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

describe('SectionNav', () => {
  it('renders all 7 section labels', () => {
    render(<SectionNav />)
    for (const { label } of CASE_STUDY_SECTIONS) {
      expect(screen.getByText(`→ ${label}`)).toBeInTheDocument()
    }
  })

  it('renders 7 anchor links with correct hrefs', () => {
    render(<SectionNav />)
    for (const { id, label } of CASE_STUDY_SECTIONS) {
      const link = screen.getByRole('link', { name: `→ ${label}` })
      expect(link).toHaveAttribute('href', `#${id}`)
    }
  })

  it('marks the first section as active by default', () => {
    render(<SectionNav />)
    const firstLink = screen.getByRole('link', { name: `→ ${CASE_STUDY_SECTIONS[0].label}` })
    expect(firstLink.className).toContain('text-accent')
  })
})
