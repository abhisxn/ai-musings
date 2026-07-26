/**
 * Pure, presentational data for the Phase 3 Track C onboarding walkthrough.
 *
 * Kept in a `.ts` (not `.tsx`) module so it's importable from unit tests that
 * run in Vitest's node environment (the component module is `.tsx` and
 * carries JSX, which the test runner won't transform under the project's
 * `jsx: preserve` setting). The component imports these; the tests assert
 * the copy is accurate against them.
 */

/** Total number of steps in the walkthrough. */
export const ONBOARDING_STEP_COUNT = 6

/**
 * The gesture → action contract documented in step 3. Mirrors Track B's
 * `useGestureControls` mapping: FIST→next render mode, OPEN PALM→next theme,
 * PINCH→toggle mood.
 */
export const GESTURE_ACTIONS = [
  { gesture: 'FIST', action: 'next render mode' },
  { gesture: 'OPEN PALM', action: 'next theme' },
  { gesture: 'PINCH', action: 'toggle mood (ARC)' },
] as const

/**
 * The keyboard shortcuts documented in step 4. Deliberately omits any theme
 * shortcut — themes cycle via the OPEN PALM gesture / the Visuals panel, not
 * a dedicated key.
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: '1–7', action: 'select render mode' },
  { keys: '0', action: 'toggle mood (ARC) on / off' },
  { keys: 'm', action: 'cycle mood: luminous → deep → pulse' },
  { keys: 'Space', action: 'toggle flat ↔ volumetric view' },
] as const

/** The three practice swatches for step 3, reusing the green/cyan/orange vocabulary. */
export const GESTURE_SWATCHES = [
  { key: 'fist', label: 'FIST', color: '#00ff41', emoji: '\u270A' },
  { key: 'open_palm', label: 'OPEN PALM', color: '#00ffff', emoji: '\uD83D\uDD90\uFE0F' },
  { key: 'pinch', label: 'PINCH', color: '#ff4400', emoji: '\uD83E\uDD0F' },
] as const
