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
  it('documents FIST → next render mode', () => {
    const fist = GESTURE_ACTIONS.find((g) => g.gesture === 'FIST')
    expect(fist?.action).toMatch(/next render mode/i)
  })

  it('documents OPEN PALM → next theme', () => {
    const palm = GESTURE_ACTIONS.find((g) => g.gesture === 'OPEN PALM')
    expect(palm?.action).toMatch(/next theme/i)
  })

  it('documents PINCH → toggle mood', () => {
    const pinch = GESTURE_ACTIONS.find((g) => g.gesture === 'PINCH')
    expect(pinch?.action).toMatch(/toggle mood/i)
  })

  it('lists gestures in FIST → OPEN PALM → PINCH order', () => {
    expect(GESTURE_ACTIONS.map((g) => g.gesture)).toEqual(['FIST', 'OPEN PALM', 'PINCH'])
  })
})

describe('keyboard shortcuts (step 4)', () => {
  it('documents keys 1–7 select render mode', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys.includes('1') && k.keys.includes('7'))
    expect(entry?.action).toMatch(/select render mode/i)
  })

  it('documents 0 toggles mood on/off', () => {
    const entry = KEYBOARD_SHORTCUTS.find((k) => k.keys === '0')
    expect(entry?.action).toMatch(/toggle mood/i)
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
  it('reuses the green / cyan / orange vocabulary', () => {
    const colors = GESTURE_SWATCHES.map((s) => s.color)
    expect(colors).toContain('#00ff41') // green
    expect(colors).toContain('#00ffff') // cyan
    expect(colors).toContain('#ff4400') // orange
  })

  it('keeps swatch keys aligned with the store gesture vocabulary', () => {
    expect(GESTURE_SWATCHES.map((s) => s.key)).toEqual(['fist', 'open_palm', 'pinch'])
  })

  it('exposes emoji glyphs for each practice swatch', () => {
    const fist = GESTURE_SWATCHES.find((s) => s.key === 'fist')
    const palm = GESTURE_SWATCHES.find((s) => s.key === 'open_palm')
    const pinch = GESTURE_SWATCHES.find((s) => s.key === 'pinch')
    expect(fist?.emoji).toBe('\u270A')
    expect(palm?.emoji).toBe('\uD83D\uDD90\uFE0F')
    expect(pinch?.emoji).toBe('\uD83E\uDD0F')
  })
})
