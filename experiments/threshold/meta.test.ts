import { describe, it, expect } from 'vitest'
import meta from './meta'

describe('threshold meta', () => {
  it('has thumbnail and hero image paths', () => {
    expect(meta.thumbnail).toMatch(/^\/experiments\/threshold\/.+\.svg$/)
    expect(meta.hero).toMatch(/^\/experiments\/threshold\/.+\.svg$/)
  })

  it('has a one-sentence summary distinct from the longer description', () => {
    expect(meta.summary.length).toBeGreaterThan(0)
    expect(meta.summary).not.toEqual(meta.description)
  })

  it('has all seven case study sections populated', () => {
    expect(meta.caseStudy.about.length).toBeGreaterThan(0)
    expect(meta.caseStudy.exploring.length).toBeGreaterThan(0)
    expect(meta.caseStudy.learnings.length).toBeGreaterThan(0)
    expect(meta.caseStudy.innerWorkings.length).toBeGreaterThan(0)
    expect(meta.caseStudy.howTo.items.length).toBeGreaterThan(0)
    expect(meta.caseStudy.expectations.length).toBeGreaterThan(0)
    expect(meta.caseStudy.versions.length).toBeGreaterThan(0)
  })
})
