import { describe, it, expect } from 'vitest'
import { useStore, RENDER_MODES } from '../store'

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
