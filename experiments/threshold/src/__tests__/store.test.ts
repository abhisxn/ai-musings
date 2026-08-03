import { describe, it, expect } from 'vitest'
import { useStore, RENDER_MODES, computeEffectiveResolution } from '../store'

describe('store defaults (Phase 6 PR1 REV 2)', () => {
  it('audioEnabled defaults to true', () => {
    expect(useStore.getState().audioEnabled).toBe(true)
  })
  it('moodEnabled defaults to true', () => {
    expect(useStore.getState().moodEnabled).toBe(true)
  })
  it('viewMode defaults to flat (REV 2 correction)', () => {
    expect(useStore.getState().viewMode).toBe('flat')
  })
  it('audioReactive stays true', () => {
    expect(useStore.getState().audioReactive).toBe(true)
  })
  it('volume stays 75', () => {
    expect(useStore.getState().volume).toBe(75)
  })
  it('currentMood stays pulse (REV 2 default)', () => {
    expect(useStore.getState().currentMood).toBe('pulse')
  })
  it('soundTexture stays bloom (Phase 5 default)', () => {
    expect(useStore.getState().soundTexture).toBe('bloom')
  })
})

describe('RENDER_MODES', () => {
  it('includes mesh as a render mode', () => {
    expect(RENDER_MODES).toContain('mesh')
  })

  it('lists eight render modes', () => {
    expect(RENDER_MODES).toHaveLength(8)
  })
})

describe('computeEffectiveResolution', () => {
  it('returns full resolution at tier 1.0', () => {
    expect(computeEffectiveResolution(64, 1.0)).toBe(64)
    expect(computeEffectiveResolution(128, 1.0)).toBe(128)
  })

  it('scales down at tier 0.75', () => {
    expect(computeEffectiveResolution(64, 0.75)).toBe(48)
    expect(computeEffectiveResolution(96, 0.75)).toBe(72)
  })

  it('scales down at tier 0.5', () => {
    expect(computeEffectiveResolution(64, 0.5)).toBe(32)
    expect(computeEffectiveResolution(128, 0.5)).toBe(64)
  })

  it('clamps to minimum 16', () => {
    expect(computeEffectiveResolution(16, 0.5)).toBe(16)
    expect(computeEffectiveResolution(20, 0.5)).toBe(16)
  })

  it('clamps to maximum 128', () => {
    expect(computeEffectiveResolution(128, 1.0)).toBe(128)
  })
})
