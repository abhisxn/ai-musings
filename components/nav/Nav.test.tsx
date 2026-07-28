import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav } from './Nav'

describe('Nav', () => {
  it('renders the portfolio logo linking to thatguyabhishek.com', () => {
    render(<Nav />)
    const logo = screen.getByRole('link', { name: /thatguyabhishek/i })
    expect(logo).toBeVisible()
    expect(logo).toHaveAttribute('href', 'https://thatguyabhishek.com')
  })

  it('renders the AI Musings link pointing to the app root', () => {
    render(<Nav />)
    const musings = screen.getAllByRole('link', { name: /ai musings/i })
    expect(musings[0]).toBeVisible()
    expect(musings[0]).toHaveAttribute('href', '/')
  })

  it('renders interactive controls', () => {
    render(<Nav />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })
})
