/// <reference types="vitest/globals" />
import { wristPositionToZoneEnergy, wristDeltaMagnitude, wristYToExtrusionDrift } from '../wrist-mapping'

describe('wristPositionToZoneEnergy', () => {
  it('returns all zeros when no hand is detected', () => {
    expect(wristPositionToZoneEnergy(null, false)).toEqual([0, 0, 0])
    expect(wristPositionToZoneEnergy({ x: 0.5, y: 0.5, z: 0 }, false)).toEqual([0, 0, 0])
  })

  it('returns all zeros when detected but wrist is null', () => {
    expect(wristPositionToZoneEnergy(null, true)).toEqual([0, 0, 0])
  })

  it('weights the left zone fully when wrist is at the left zone center, and falls off to 0 at the neighboring center', () => {
    const [left, center, right] = wristPositionToZoneEnergy({ x: 1 / 6, y: 0.5, z: 0 }, true)
    expect(left).toBeCloseTo(1)
    expect(center).toBeCloseTo(0)
    expect(right).toBeCloseTo(0)
  })

  it('weights the center zone fully when wrist is at the center, and falls off to 0 at neighboring centers', () => {
    const [left, center, right] = wristPositionToZoneEnergy({ x: 0.5, y: 0.5, z: 0 }, true)
    expect(left).toBeCloseTo(0)
    expect(center).toBeCloseTo(1)
    expect(right).toBeCloseTo(0)
  })

  it('weights the right zone fully when wrist is at the right zone center, and falls off to 0 at the neighboring center', () => {
    const [left, center, right] = wristPositionToZoneEnergy({ x: 5 / 6, y: 0.5, z: 0 }, true)
    expect(left).toBeCloseTo(0)
    expect(center).toBeCloseTo(0)
    expect(right).toBeCloseTo(1)
  })

  it('gives partial weight to a zone halfway between its center and a neighboring center', () => {
    // Halfway between left center (1/6) and center-zone center (1/2) is 1/3,
    // which is half a zone-width away from each - both should read ~0.5.
    const [left, center] = wristPositionToZoneEnergy({ x: 1 / 3, y: 0.5, z: 0 }, true)
    expect(left).toBeCloseTo(0.5)
    expect(center).toBeCloseTo(0.5)
  })

  it('clamps weight at 0 rather than going negative far from a zone', () => {
    const [left] = wristPositionToZoneEnergy({ x: 1, y: 0.5, z: 0 }, true)
    expect(left).toBe(0)
  })
})

describe('wristDeltaMagnitude', () => {
  it('returns 0 when either position is missing', () => {
    expect(wristDeltaMagnitude(null, null)).toBe(0)
    expect(wristDeltaMagnitude({ x: 0.5, y: 0.5, z: 0 }, null)).toBe(0)
    expect(wristDeltaMagnitude(null, { x: 0.5, y: 0.5, z: 0 })).toBe(0)
  })

  it('returns 0 for no movement', () => {
    const p = { x: 0.5, y: 0.5, z: 0 }
    expect(wristDeltaMagnitude(p, p)).toBe(0)
  })

  it('scales small displacements up into a usable range', () => {
    const a = { x: 0.5, y: 0.5, z: 0 }
    const b = { x: 0.52, y: 0.5, z: 0 }
    const magnitude = wristDeltaMagnitude(a, b)
    expect(magnitude).toBeGreaterThan(0)
    expect(magnitude).toBeLessThanOrEqual(1)
  })

  it('clamps large displacements at 1', () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 1, y: 1, z: 0 }
    expect(wristDeltaMagnitude(a, b)).toBe(1)
  })

  it('ignores z when computing displacement', () => {
    const a = { x: 0.5, y: 0.5, z: 0 }
    const b = { x: 0.5, y: 0.5, z: 0.9 }
    expect(wristDeltaMagnitude(a, b)).toBe(0)
  })
})

describe('wristYToExtrusionDrift', () => {
  it('returns 0 when no hand is detected', () => {
    expect(wristYToExtrusionDrift(null, false)).toBe(0)
    expect(wristYToExtrusionDrift({ x: 0.5, y: 0, z: 0 }, false)).toBe(0)
  })

  it('returns 0 when detected but wrist is null', () => {
    expect(wristYToExtrusionDrift(null, true)).toBe(0)
  })

  it('returns 0 drift when wrist is vertically centered', () => {
    expect(wristYToExtrusionDrift({ x: 0.5, y: 0.5, z: 0 }, true)).toBeCloseTo(0)
  })

  it('drifts toward +MAX when the wrist is raised to the top of frame', () => {
    const drift = wristYToExtrusionDrift({ x: 0.5, y: 0, z: 0 }, true)
    expect(drift).toBeCloseTo(2)
  })

  it('drifts toward -MAX when the wrist is lowered to the bottom of frame', () => {
    const drift = wristYToExtrusionDrift({ x: 0.5, y: 1, z: 0 }, true)
    expect(drift).toBeCloseTo(-2)
  })

  it('clamps drift at +MAX/-MAX for out-of-range y values', () => {
    expect(wristYToExtrusionDrift({ x: 0.5, y: -1, z: 0 }, true)).toBe(2)
    expect(wristYToExtrusionDrift({ x: 0.5, y: 2, z: 0 }, true)).toBe(-2)
  })
})
