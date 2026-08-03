/// <reference types="vitest/globals" />
import {
  ONBOARDING_STEP_COUNT,
  GESTURE_ACTIONS,
  KEYBOARD_SHORTCUTS,
  GESTURE_SWATCHES,
} from '../onboardingSteps'

describe('OnboardingOverlay walkthrough shape', () => {
  it('exposes exactly six steps', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(6)
  })
})

describe('gesture → action contract (step 3)', () => {
  it('documents FIST → toggle flat/volumetric view', () => {
    const fist = GESTURE_ACTIONS.find((g) => g.gesture === 'FIST')
    expect(fist?.action).toMatch(/flat/i)
    expect(fist?.action).toMatch(/volumetric/i)
  })

  it('documents THUMB UP → next render mode', () => {
    const up = GESTURE_ACTIONS.find((g) => g.gesture === 'THUMB UP')
    expect(up?.action).toMatch(/next render mode/i)
  })

  it('documents THUMB DOWN → previous render mode', () => {
    const down = GESTURE_ACTIONS.find((g) => g.gesture === 'THUMB DOWN')
    expect(down?.action).toMatch(/previous render mode/i)
  })

  it('documents OPEN PALM → toggle Session Arc (mood)', () => {
    const palm = GESTURE_ACTIONS.find((g) => g.gesture === 'OPEN PALM')
    expect(palm?.action).toMatch(/toggle Session Arc/i)
    expect(palm?.action).toMatch(/mood/i)
  })

  it('documents PINCH → live threshold control', () => {
    const pinch = GESTURE_ACTIONS.find((g) => g.gesture === 'PINCH')
    expect(pinch?.action).toMatch(/live threshold control/i)
  })

  it('lists gestures in FIST → OPEN PALM → PINCH → THUMB UP → THUMB DOWN order', () => {
    expect(GESTURE_ACTIONS.map((g) => g.gesture)).toEqual([
      'FIST',
      'OPEN PALM',
      'PINCH',
      'THUMB UP',
      'THUMB DOWN',
    ])
  })
})

describe('keyboard shortcuts (step 4)', () => {
  it('documents keys 1-8 select render mode', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys.includes('1') && k.keys.includes('8'))
    expect(entry?.action).toMatch(/select render mode/i)
  })

  it('documents a toggles Session Arc on/off', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys === 'a')
    expect(entry?.action).toMatch(/toggle.*arc/i)
  })

  it('documents m cycles mood', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys === 'm')
    expect(entry?.action).toMatch(/cycle mood/i)
  })

  it('documents Space toggles flat / volumetric view', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys === 'Space')
    expect(entry?.action).toMatch(/flat/i)
    expect(entry?.action).toMatch(/volumetric/i)
  })

  it('does NOT claim a theme shortcut key', () => {
    // No shortcut whose key is the letter T (case-insensitive) — themes cycle
    // via the OPEN PALM gesture / Visuals panel, never a dedicated key.
    const themeKey = KEYBOARD_SHORTCUTS.find((k) => k.keys.toLowerCase() === 't')
    expect(themeKey).toBeUndefined()
  })
})

describe('gesture practice swatches (step 3)', () => {
  it('reuses the green / cyan / orange / yellow / magenta vocabulary', () => {
    const colors = GESTURE_SWATCHES.map((s) => s.color)
    expect(colors).toContain('#00ff41') // green
    expect(colors).toContain('#00ffff') // cyan
    expect(colors).toContain('#ff4400') // orange
    expect(colors).toContain('#ffff00') // yellow
    expect(colors).toContain('#ff00ff') // magenta
  })

  it('keeps swatch keys aligned with the store gesture vocabulary', () => {
    expect(GESTURE_SWATCHES.map((s) => s.key)).toEqual([
      'fist',
      'open_palm',
      'pinch',
      'thumb_up',
      'thumb_down',
    ])
  })

  it('exposes emoji glyphs for each practice swatch', () => {
    const fist = GESTURE_SWATCHES.find((s) => s.key === 'fist')
    const palm = GESTURE_SWATCHES.find((s) => s.key === 'open_palm')
    const pinch = GESTURE_SWATCHES.find((s) => s.key === 'pinch')
    const thumbUp = GESTURE_SWATCHES.find((s) => s.key === 'thumb_up')
    const thumbDown = GESTURE_SWATCHES.find((s) => s.key === 'thumb_down')
    expect(fist?.emoji).toBe('\u270A')
    expect(palm?.emoji).toBe('\uD83D\uDD90\uFE0F')
    expect(pinch?.emoji).toBe('\uD83E\uDD0F')
    expect(thumbUp?.emoji).toBe('\uD83D\uDC4D')
    expect(thumbDown?.emoji).toBe('\uD83D\uDC4E')
  })
})
