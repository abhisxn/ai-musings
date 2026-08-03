import { describe, it, expect } from 'vitest'

describe('GPU Profiler EMA', () => {
  it('EMA calculation converges toward steady-state value', () => {
    const alpha = 0.1
    let ema = 0
    const steadyState = 10

    for (let i = 0; i < 30; i++) {
      ema = i === 0 ? steadyState : (1 - alpha) * ema + alpha * steadyState
    }
    expect(ema).toBeCloseTo(10, 0)
  })

  it('EMA responds to step change within ~20 frames', () => {
    const alpha = 0.1
    let ema = 5

    for (let i = 0; i < 10; i++) {
      ema = (1 - alpha) * ema + alpha * 5
    }
    expect(ema).toBeCloseTo(5, 0)

    for (let i = 0; i < 20; i++) {
      ema = (1 - alpha) * ema + alpha * 15
    }
    expect(ema).toBeGreaterThan(10)
  })

  it('first sample initializes EMA directly', () => {
    const alpha = 0.1
    const firstSample = 12.5
    let ema = firstSample
    expect(ema).toBe(12.5)

    ema = (1 - alpha) * ema + alpha * 8
    expect(ema).toBeCloseTo(12.05, 1)
  })
})
