import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello Card</Card>)
    expect(screen.getByText('Hello Card')).toBeVisible()
  })
})
