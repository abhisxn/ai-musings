/// <reference types="vitest/globals" />
import { getTextureVoicePitchShift, getModeThemePitchShift, volumeToDb } from '../audio'
import { RENDER_MODES, THEMES_LIST } from '../store'
import { moodTextureToSoundTexture } from '../mood-config'

describe('volumeToDb', () => {
  it('returns -Infinity for volume 0', () => {
    expect(volumeToDb(0)).toBe(-Infinity)
  })

  it('returns ~0dB at volume 100', () => {
    expect(volumeToDb(100)).toBeCloseTo(0, 5)
  })

  it('is louder than the linear -15dB baseline at volume 75', () => {
    const linearBaseline = -15
    expect(volumeToDb(75)).toBeGreaterThan(linearBaseline)
  })

  it('handles negative volumes as silent', () => {
    expect(volumeToDb(-5)).toBe(-Infinity)
  })
})

describe('getTextureVoicePitchShift', () => {
  it('returns 0 semitones for calm', () => {
    expect(getTextureVoicePitchShift('calm')).toBe(0)
  })

  it('returns 5 semitones for active', () => {
    expect(getTextureVoicePitchShift('active')).toBe(5)
  })

  it('returns 12 semitones for climax', () => {
    expect(getTextureVoicePitchShift('climax')).toBe(12)
  })
})

describe('getModeThemePitchShift', () => {
  it('accepts every renderMode as a valid input (no throw)', () => {
    for (const mode of RENDER_MODES) {
      expect(() => getModeThemePitchShift(mode, 'dark')).not.toThrow()
    }
  })

  it('accepts every theme as a valid input (no throw)', () => {
    for (const theme of THEMES_LIST) {
      expect(() => getModeThemePitchShift('dots', theme)).not.toThrow()
    }
  })

  it('returns a deterministic value for the same inputs', () => {
    const a = getModeThemePitchShift('hline', 'acid')
    const b = getModeThemePitchShift('hline', 'acid')
    expect(a).toBe(b)
  })

  it('returns an integer within -3..+3 semitones for every combination', () => {
    for (const mode of RENDER_MODES) {
      for (const theme of THEMES_LIST) {
        const shift = getModeThemePitchShift(mode, theme)
        expect(Number.isInteger(shift)).toBe(true)
        expect(shift).toBeGreaterThanOrEqual(-3)
        expect(shift).toBeLessThanOrEqual(3)
      }
    }
  })

  it('at least one combination differs from at least one other combination', () => {
    const set = new Set<string>()
    for (const mode of RENDER_MODES) {
      for (const theme of THEMES_LIST) {
        set.add(getModeThemePitchShift(mode, theme).toString())
      }
    }
    expect(set.size).toBeGreaterThan(1)
  })

  it('is additive to (does not replace) the existing phase shift', () => {
    const modeTheme = getModeThemePitchShift('pixel', 'heatmap')
    const phaseCalm = getTextureVoicePitchShift('calm')
    const phaseActive = getTextureVoicePitchShift('active')
    expect(modeTheme + phaseCalm).not.toBe(phaseActive)
    expect(modeTheme + phaseActive).not.toBe(phaseCalm)
  })
})

describe('effective texture resolution (mirrors useAudio internal logic)', () => {
  const resolveEffectiveTexture = (
    moodEnabled: boolean,
    moodTextureType: 'airy' | 'glitch' | 'rumble',
    soundTexture: 'off' | 'ambient' | 'bloom' | 'bloom2' | 'glitch' | 'glitch2' | 'pulse' | 'bass',
  ) => (moodEnabled ? moodTextureToSoundTexture(moodTextureType) : soundTexture)

  it('uses the raw soundTexture when moodEnabled is false', () => {
    expect(resolveEffectiveTexture(false, 'airy', 'bass')).toBe('bass')
  })

  it('uses the mood-derived texture when moodEnabled is true, ignoring the raw soundTexture', () => {
    expect(resolveEffectiveTexture(true, 'rumble', 'bloom')).toBe('bass')
  })

  it('maps airy mood → ambient (Phase 6 extension)', () => {
    expect(resolveEffectiveTexture(true, 'airy', 'bloom')).toBe('ambient')
  })

  it('maps glitch mood → glitch2 (Phase 6 extension)', () => {
    expect(resolveEffectiveTexture(true, 'glitch', 'bloom')).toBe('glitch2')
  })
})
