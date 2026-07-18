export type Mood = 'luminous' | 'deep' | 'pulse'
export type Phase = 'calm' | 'active' | 'climax'

export interface HandTracking {
  detected: boolean
  wrist: { x: number; y: number; z: number } | null
  pinchDistance: number
  gesture: 'fist' | 'open_palm' | 'pinch' | null
  confidence: number
}
