/// <reference types="vitest/globals" />
import { MOOD_CONFIGS, getPhaseTempo } from '../mood-config'
import { Mood } from '../types'

const ALL_MOODS: Mood[] = ['luminous', 'deep', 'pulse', 'solar', 'azure']

describe('MOOD_CONFIGS', () => {
  it('has exactly 5 moods', () => {
    expect(Object.keys(MOOD_CONFIGS).sort()).toEqual([...ALL_MOODS].sort())
  })

  it('gives every mood a complete config shape', () => {
    for (const mood of ALL_MOODS) {
      const cfg = MOOD_CONFIGS[mood]
      expect(typeof cfg.name).toBe('string')
      expect(typeof cfg.color).toBe('string')
      expect(typeof cfg.baseHue).toBe('number')
      expect(Array.isArray(cfg.scale)).toBe(true)
      expect(typeof cfg.scaleName).toBe('string')
      expect(cfg.tempoRange.length).toBe(2)
      expect(['amsynth', 'fmsynth', 'monosynth']).toContain(cfg.padWaveform)
      expect(typeof cfg.rhythmPattern).toBe('string')
      expect(['airy', 'glitch', 'rumble']).toContain(cfg.textureType)
    }
  })

  it('gives solar and azure distinct hues from the original 3 moods', () => {
    const hues = ALL_MOODS.map((m) => MOOD_CONFIGS[m].baseHue)
    expect(new Set(hues).size).toBe(5)
  })
})

describe('getPhaseTempo', () => {
  it('returns tempoRange bounds for calm and climax for every mood', () => {
    for (const mood of ALL_MOODS) {
      const [min, max] = MOOD_CONFIGS[mood].tempoRange
      expect(getPhaseTempo(mood, 'calm')).toBe(min)
      expect(getPhaseTempo(mood, 'climax')).toBe(max)
    }
  })
})
