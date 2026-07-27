import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExperimentCard } from './ExperimentCard'
import { assetPath } from '@/lib/assetPath'
import meta from '@/experiments/threshold/meta'

describe('ExperimentCard', () => {
  it('renders title, summary, and thumbnail for a real experiment', () => {
    render(<ExperimentCard experiment={meta} />)

    expect(screen.getByRole('heading', { level: 2, name: meta.title })).toBeVisible()
    expect(screen.getByText(meta.summary)).toBeVisible()

    const img = screen.getByRole('img', { name: meta.title })
    expect(img).toBeVisible()
    expect(img).toHaveAttribute('src', assetPath(meta.thumbnail))
  })

  it('links to the flattened /[slug] route', () => {
    render(<ExperimentCard experiment={meta} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/${meta.slug}`)
  })
})
