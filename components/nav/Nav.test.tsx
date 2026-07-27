import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav } from './Nav'

describe('Nav', () => {
  it('renders the wordmark linking to /', () => {
    render(<Nav />)
    const wordmark = screen.getByRole('link', { name: /ai\s*musings/i })
    expect(wordmark).toBeVisible()
    expect(wordmark).toHaveAttribute('href', '/')
  })

  it('renders the theme toggle button', () => {
    render(<Nav />)
    const toggle = screen.getByRole('button')
    expect(toggle).toBeInTheDocument()
  })
})
