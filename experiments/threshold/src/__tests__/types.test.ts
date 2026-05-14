// experiments/threshold/src/__tests__/types.test.ts
import { GestureType, HallucinatedControl } from '../types'

describe('Gesture Types', () => {
  it('should define jazz hands gesture', () => {
    const gesture: GestureType = 'jazz-hands'
    expect(gesture).toBe('jazz-hands')
  })

  it('should define hallucinated control interface', () => {
    const control: HallucinatedControl = {
      id: 'glitch-intensity',
      label: 'Glitch Intensity',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.5
    }
    expect(control.id).toBe('glitch-intensity')
  })
})