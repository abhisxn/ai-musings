/// <reference types="vitest/globals" />
import { HandTracking } from '../types'

describe('HandTracking', () => {
  it('should define a detected hand with a wrist position', () => {
    const handTracking: HandTracking = {
      detected: true,
      wrist: { x: 0.5, y: 0.5, z: 0 },
      pinchDistance: 0.1,
      gesture: 'pinch',
      confidence: 0.9,
    }
    expect(handTracking.detected).toBe(true)
    expect(handTracking.gesture).toBe('pinch')
  })

  it('should allow no hand detected', () => {
    const handTracking: HandTracking = {
      detected: false,
      wrist: null,
      pinchDistance: 0,
      gesture: null,
      confidence: 0,
    }
    expect(handTracking.detected).toBe(false)
    expect(handTracking.wrist).toBeNull()
  })
})
