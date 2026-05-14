// experiments/threshold/src/types.ts
export type GestureType = 'jazz-hands' | 'peace-sign' | 'fist-pump'

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