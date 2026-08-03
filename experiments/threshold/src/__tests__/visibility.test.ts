import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

describe('Visibility Lifecycle', () => {
  beforeEach(() => {
    useStore.setState({ isVisible: true })
  })

  it('defaults to visible', () => {
    expect(useStore.getState().isVisible).toBe(true)
  })

  it('can be set to hidden', () => {
    useStore.getState().setIsVisible(false)
    expect(useStore.getState().isVisible).toBe(false)
  })

  it('can be restored to visible', () => {
    useStore.getState().setIsVisible(false)
    useStore.getState().setIsVisible(true)
    expect(useStore.getState().isVisible).toBe(true)
  })
})
