/// <reference types="vitest/globals" />
import {
  calculateLandmarkDistance,
  normalizePinchDistance,
  derivePinchGesture,
  resolveGesture,
  resolveContinuousValue,
  detectGestureEdge,
} from '../pinch'

describe('calculateLandmarkDistance', () => {
  it('returns 0 for identical points', () => {
    const point = { x: 0.5, y: 0.5, z: 0 }
    expect(calculateLandmarkDistance(point, point)).toBe(0)
  })

  it('computes 3D euclidean distance between two points', () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 3, y: 4, z: 0 }
    expect(calculateLandmarkDistance(a, b)).toBe(5)
  })

  it('accounts for the z axis', () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 0, y: 0, z: 2 }
    expect(calculateLandmarkDistance(a, b)).toBe(2)
  })

  it('is symmetric regardless of argument order', () => {
    const a = { x: 0.1, y: 0.2, z: 0.05 }
    const b = { x: 0.4, y: 0.6, z: 0.1 }
    expect(calculateLandmarkDistance(a, b)).toBeCloseTo(calculateLandmarkDistance(b, a))
  })
})

describe('normalizePinchDistance', () => {
  it('maps a distance at or below the minimum to 0', () => {
    expect(normalizePinchDistance(0, 0.02, 0.3)).toBe(0)
    expect(normalizePinchDistance(0.01, 0.02, 0.3)).toBe(0)
  })

  it('maps a distance at or above the maximum to 1', () => {
    expect(normalizePinchDistance(0.3, 0.02, 0.3)).toBe(1)
    expect(normalizePinchDistance(0.5, 0.02, 0.3)).toBe(1)
  })

  it('linearly interpolates between min and max', () => {
    // midpoint of [0.02, 0.3] -> 0.16
    expect(normalizePinchDistance(0.16, 0.02, 0.3)).toBeCloseTo(0.5, 5)
  })

  it('uses sensible defaults when min/max are omitted', () => {
    const result = normalizePinchDistance(0.02)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('derivePinchGesture', () => {
  it('returns "pinch" when normalized distance is at or below the threshold', () => {
    expect(derivePinchGesture(0.1, 0.15)).toBe('pinch')
    expect(derivePinchGesture(0.15, 0.15)).toBe('pinch')
  })

  it('returns null when normalized distance is above the threshold', () => {
    expect(derivePinchGesture(0.2, 0.15)).toBeNull()
  })

  it('uses a sensible default threshold when omitted', () => {
    expect(derivePinchGesture(0.01)).toBe('pinch')
    expect(derivePinchGesture(0.9)).toBeNull()
  })
})

describe('resolveGesture', () => {
  it('passes through the raw gesture when confidence is high and hand is detected', () => {
    expect(resolveGesture('fist', true, 0.9)).toBe('fist')
    expect(resolveGesture('pinch', true, 0.6)).toBe('pinch')
    expect(resolveGesture(null, true, 0.9)).toBeNull()
  })

  it('resolves to null when confidence is below the threshold', () => {
    expect(resolveGesture('fist', true, 0.59)).toBeNull()
  })

  it('resolves to null when the hand is not detected, regardless of confidence', () => {
    expect(resolveGesture('open_palm', false, 0.95)).toBeNull()
  })

  it('supports a custom confidence threshold', () => {
    expect(resolveGesture('pinch', true, 0.5, 0.4)).toBe('pinch')
    expect(resolveGesture('pinch', true, 0.3, 0.4)).toBeNull()
  })
})

describe('resolveContinuousValue', () => {
  it('returns the current value when confidence is high and hand is detected', () => {
    expect(resolveContinuousValue(0.7, 0.2, true, 0.9)).toBe(0.7)
  })

  it('holds the previous value when confidence is below the threshold', () => {
    expect(resolveContinuousValue(0.7, 0.2, true, 0.4)).toBe(0.2)
  })

  it('holds the previous value when the hand is out of frame', () => {
    expect(resolveContinuousValue(0.7, 0.2, false, 0.95)).toBe(0.2)
  })

  it('does not snap to zero when hand briefly drops out of frame', () => {
    const result = resolveContinuousValue(0, 0.55, false, 0)
    expect(result).toBe(0.55)
  })

  it('supports a custom confidence threshold', () => {
    expect(resolveContinuousValue(0.9, 0.1, true, 0.5, 0.4)).toBe(0.9)
    expect(resolveContinuousValue(0.9, 0.1, true, 0.3, 0.4)).toBe(0.1)
  })
})

describe('detectGestureEdge', () => {
  it('reports "entered" when transitioning from no gesture into a gesture', () => {
    const edge = detectGestureEdge(null, 'pinch')
    expect(edge.entered).toBe('pinch')
    expect(edge.exited).toBeNull()
  })

  it('reports nothing while a gesture is continuously held', () => {
    const edge = detectGestureEdge('pinch', 'pinch')
    expect(edge.entered).toBeNull()
    expect(edge.exited).toBeNull()
  })

  it('reports "exited" when transitioning from a gesture back to none', () => {
    const edge = detectGestureEdge('fist', null)
    expect(edge.entered).toBeNull()
    expect(edge.exited).toBe('fist')
  })

  it('reports both exited and entered when switching directly between two gestures', () => {
    const edge = detectGestureEdge('fist', 'open_palm')
    expect(edge.exited).toBe('fist')
    expect(edge.entered).toBe('open_palm')
  })

  it('fires only once across repeated identical frames (not on every held frame)', () => {
    const frames: Array<'fist' | 'open_palm' | 'pinch' | null> = [null, 'fist', 'fist', 'fist', null]
    const entries: Array<'fist' | 'open_palm' | 'pinch'> = []
    const exits: Array<'fist' | 'open_palm' | 'pinch'> = []
    for (let i = 1; i < frames.length; i++) {
      const edge = detectGestureEdge(frames[i - 1], frames[i])
      if (edge.entered) entries.push(edge.entered)
      if (edge.exited) exits.push(edge.exited)
    }
    expect(entries).toEqual(['fist'])
    expect(exits).toEqual(['fist'])
  })

  it('works generically for all three discrete gestures', () => {
    expect(detectGestureEdge(null, 'open_palm').entered).toBe('open_palm')
    expect(detectGestureEdge(null, 'fist').entered).toBe('fist')
    expect(detectGestureEdge(null, 'pinch').entered).toBe('pinch')
  })
})
