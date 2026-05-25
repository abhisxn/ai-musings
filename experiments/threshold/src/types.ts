export type GestureType = 'jazz-hands' | 'peace-sign' | 'fist-pump'

export type Mood = 'luminous' | 'deep' | 'pulse'
export type Phase = 'calm' | 'active' | 'climax'
export type InputSource = 'pixel' | 'demo'

export interface PoseKeypoint {
  x: number
  y: number
  z: number
  confidence: number
}

export interface HallucinatedControl {
  id: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export interface AIComposerState {
  currentGesture: GestureType | null
  confidence: number
  hallucinatedControls: HallucinatedControl[]
  shaderCode: string | null
  audioProfile: string | null
}
