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
 * `useGestureControls` mapping: FIST→toggle flat/volumetric view, OPEN PALM→
 * toggle Session Arc (mood), PINCH→live threshold control, THUMB UP→next
 * render mode, THUMB DOWN→previous render mode.
 */
export const GESTURE_ACTIONS = [
  { gesture: 'FIST', action: 'toggle flat ↔ volumetric view' },
  { gesture: 'OPEN PALM', action: 'toggle Session Arc (mood)' },
  { gesture: 'PINCH', action: 'live threshold control' },
  { gesture: 'THUMB UP', action: 'next render mode' },
  { gesture: 'THUMB DOWN', action: 'previous render mode' },
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

/** The five practice swatches for step 3, reusing the green/cyan/orange/yellow/magenta vocabulary. */
export const GESTURE_SWATCHES = [
  { key: 'fist', label: 'FIST', color: '#00ff41', emoji: '\u270A' },
  { key: 'open_palm', label: 'OPEN PALM', color: '#00ffff', emoji: '\uD83D\uDD90\uFE0F' },
  { key: 'pinch', label: 'PINCH', color: '#ff4400', emoji: '\uD83E\uDD0F' },
  { key: 'thumb_up', label: 'THUMB UP', color: '#ffff00', emoji: '\uD83D\uDC4D' },
  { key: 'thumb_down', label: 'THUMB DOWN', color: '#ff00ff', emoji: '\uD83D\uDC4E' },
] as const
