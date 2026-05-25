import { Mood } from './types'
import { MOOD_CONFIGS } from './mood-config'

export class MarkovMelody {
  private table: Record<number, number[]> = {}
  private currentNote = 0
  private scale: string[] = []

  constructor(mood: Mood) {
    this.scale = MOOD_CONFIGS[mood].scale
    for (let i = 0; i < this.scale.length; i++) {
      const transitions: number[] = []
      transitions.push(i, i)
      if (i > 0) transitions.push(i - 1, i - 1)
      if (i < this.scale.length - 1) transitions.push(i + 1, i + 1)
      if (i > 1) transitions.push(i - 2)
      if (i < this.scale.length - 2) transitions.push(i + 2)
      transitions.push(Math.floor(Math.random() * this.scale.length))
      this.table[i] = transitions
    }
    this.currentNote = Math.floor(this.scale.length / 2)
  }

  next(): string {
    const transitions = this.table[this.currentNote]
    this.currentNote = transitions[Math.floor(Math.random() * transitions.length)]
    this.currentNote = Math.max(0, Math.min(this.scale.length - 1, this.currentNote))
    return this.scale[this.currentNote]
  }
}
