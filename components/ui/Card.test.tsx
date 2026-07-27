import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText('Hello')).toBeVisible()
  })

  it('lets callers override inner content padding via contentClassName', () => {
    const { container } = render(<Card contentClassName="p-0">Flush</Card>)
    const innerDiv = container.querySelector('.bg-surface-2')
    expect(innerDiv).not.toBeNull()
    expect(innerDiv!.className).toContain('p-0')
    expect(innerDiv!.className).not.toContain('p-4')
    expect(screen.getByText('Flush')).toBeVisible()
  })
})
