import { Mood } from './types'

export interface MoodConfig {
  name: string
  color: string
  baseHue: number
  scale: string[]
  scaleName: string
  tempoRange: [number, number]
  padWaveform: 'amsynth' | 'fmsynth' | 'monosynth'
  rhythmPattern: string
  textureType: 'airy' | 'glitch' | 'rumble'
}

export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  luminous: {
    name: 'LUMINOUS',
    color: '#00ff41',
    baseHue: 140,
    scale: ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4'],
    scaleName: 'C major pentatonic',
    tempoRange: [60, 120],
    padWaveform: 'amsynth',
    rhythmPattern: '4/4 soft',
    textureType: 'airy',
  },
  deep: {
    name: 'DEEP',
    color: '#ff00ff',
    baseHue: 300,
    scale: ['D#2', 'F#2', 'G#2', 'B2', 'C#3', 'D#3', 'F#3', 'G#3', 'B3'],
    scaleName: 'D# harmonic minor',
    tempoRange: [40, 100],
    padWaveform: 'fmsynth',
    rhythmPattern: '7/8 glitch',
    textureType: 'glitch',
  },
  pulse: {
    name: 'PULSE',
    color: '#ff4400',
    baseHue: 20,
    scale: ['A2', 'C3', 'D3', 'Eb3', 'E3', 'G3', 'A3', 'C4', 'D4'],
    scaleName: 'A blues',
    tempoRange: [80, 140],
    padWaveform: 'monosynth',
    rhythmPattern: '4/4 heavy',
    textureType: 'rumble',
  },
}

export function getPhaseTempo(mood: Mood, phase: 'calm' | 'active' | 'climax'): number {
  const [min, max] = MOOD_CONFIGS[mood].tempoRange
  switch (phase) {
    case 'calm': return min
    case 'active': return min + (max - min) * 0.5
    case 'climax': return max
  }
}

