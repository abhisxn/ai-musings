/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, RENDER_MODES, THEMES_LIST, type RenderMode, type Theme } from '../store'
import { nextRenderMode, nextTheme, nextMoodEnabled } from '../useGestureControls'
import type { Gesture } from '../vision/pinch'

// The hook (`useGestureControls`) drives the zustand store from inside a React
// effect: on each `handTracking.gesture` change it advances render mode / theme
// or toggles mood, acting ONLY on the null -> gesture enter edge (a ref mirrors
// the last-seen gesture). This repo has no DOM test environment available
// (no jsdom/happy-dom and @testing-library/react is not a dependency, and no new
// dependencies are permitted), so the hook cannot be rendered with `renderHook`.
// Instead we drive the REAL store and assert on the REAL resulting state
// (`renderMode` / `theme` / `moodEnabled`) — the preferred store-driven approach.
// The `applyGestureEdge` harness below is a faithful mirror of the hook's effect
// body (see useGestureControls.ts lines 54-71): same skip-on-equal, same null
// guard, same per-gesture dispatch, reusing the real `next*` cycle helpers. We
// thread the returned "last gesture" between calls so the one-shot edge
// semantics are exercised exactly as the hook's ref does.

const INITIAL_HAND_TRACKING = {
  detected: false,
  wrist: null,
  pinchDistance: 0,
  gesture: null as Gesture,
  confidence: 0,
}

function resetStore(): void {
  useStore.setState({
    renderMode: 'radio' as RenderMode,
    theme: 'dark' as Theme,
    moodEnabled: false,
    handTracking: { ...INITIAL_HAND_TRACKING },
  })
}

// Mirrors the hook's effect body exactly; returns the new "last gesture".
function applyGestureEdge(prev: Gesture, gesture: Gesture): Gesture {
  if (gesture === prev) return prev
  const s = useStore.getState()
  if (gesture !== null) {
    switch (gesture) {
      case 'fist':
        s.setRenderMode(nextRenderMode(s.renderMode))
        break
      case 'open_palm':
        s.setTheme(nextTheme(s.theme))
        break
      case 'pinch':
        s.setMoodEnabled(nextMoodEnabled(s.moodEnabled))
        break
    }
  }
  return gesture
}

describe('useGestureControls — edge detection + dispatch (store-driven)', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('FIST -> cycle render mode', () => {
    it('fires setRenderMode exactly once on null -> fist (advancing one step in RENDER_MODES)', () => {
      const startMode = useStore.getState().renderMode
      const idxBefore = RENDER_MODES.indexOf(startMode)
      const expected = RENDER_MODES[(idxBefore + 1) % RENDER_MODES.length]

      const last = applyGestureEdge(null, 'fist')

      expect(useStore.getState().renderMode).toBe(expected)
      expect(last).toBe('fist')
    })

    it('does NOT re-fire on fist -> fist (same gesture held)', () => {
      const last = applyGestureEdge(null, 'fist')
      const firedMode = useStore.getState().renderMode

      applyGestureEdge(last, 'fist')

      expect(useStore.getState().renderMode).toBe(firedMode)
    })

    it('fires once per null -> fist -> null -> fist cycle (no rapid-fire on held gesture)', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'fist')
      const afterFirst = useStore.getState().renderMode
      expect(afterFirst).not.toBe('radio')

      last = applyGestureEdge(last, 'fist')
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, null)
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, 'fist')
      const afterSecond = useStore.getState().renderMode
      expect(afterSecond).toBe(nextRenderMode(afterFirst))
      expect(afterSecond).not.toBe(afterFirst)
    })
  })

  describe('OPEN_PALM -> cycle theme', () => {
    it('fires setTheme exactly once on null -> open_palm', () => {
      const startTheme = useStore.getState().theme
      const idxBefore = THEMES_LIST.indexOf(startTheme)
      const expected = THEMES_LIST[(idxBefore + 1) % THEMES_LIST.length]

      const last = applyGestureEdge(null, 'open_palm')

      expect(useStore.getState().theme).toBe(expected)
      expect(last).toBe('open_palm')
    })

    it('does NOT re-fire on open_palm -> open_palm', () => {
      const last = applyGestureEdge(null, 'open_palm')
      const firedTheme = useStore.getState().theme

      applyGestureEdge(last, 'open_palm')

      expect(useStore.getState().theme).toBe(firedTheme)
    })
  })

  describe('PINCH -> toggle moodEnabled', () => {
    it('fires setMoodEnabled exactly once on null -> pinch (toggling false -> true)', () => {
      expect(useStore.getState().moodEnabled).toBe(false)

      const last = applyGestureEdge(null, 'pinch')

      expect(useStore.getState().moodEnabled).toBe(true)
      expect(last).toBe('pinch')
    })

    it('does NOT re-fire on pinch -> pinch (no rapid toggle)', () => {
      const last = applyGestureEdge(null, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(true)

      applyGestureEdge(last, 'pinch')

      expect(useStore.getState().moodEnabled).toBe(true)
    })

    it('toggles again only after returning through null', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, null)
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(false)
    })
  })

  describe('edge semantics across gestures', () => {
    it('null -> gesture fires; gesture -> same gesture does NOT fire; gesture -> null -> different gesture fires once', () => {
      let last: Gesture = null

      // null -> fist fires render mode only
      last = applyGestureEdge(last, 'fist')
      const modeAfterFist = useStore.getState().renderMode
      const themeAfterFist = useStore.getState().theme
      const moodAfterFist = useStore.getState().moodEnabled
      expect(modeAfterFist).not.toBe('radio')
      expect(themeAfterFist).toBe('dark')
      expect(moodAfterFist).toBe(false)

      // fist -> fist: nothing fires
      last = applyGestureEdge(last, 'fist')
      expect(useStore.getState().renderMode).toBe(modeAfterFist)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)

      // fist -> null: no dispatch (null guard), just updates last
      last = applyGestureEdge(last, null)
      expect(useStore.getState().renderMode).toBe(modeAfterFist)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)

      // null -> open_palm fires theme only
      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().renderMode).toBe(modeAfterFist)
      expect(useStore.getState().theme).not.toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)

      // open_palm -> null -> pinch fires mood only
      last = applyGestureEdge(last, null)
      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().renderMode).toBe(modeAfterFist)
      expect(useStore.getState().moodEnabled).toBe(true)
    })

    it('a different gesture immediately after another (no null gap) fires the new dispatch once', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'fist')
      const modeAfterFist = useStore.getState().renderMode

      // fist -> open_palm is a gesture change (not equal), so open_palm fires once.
      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().renderMode).toBe(modeAfterFist)
      expect(useStore.getState().theme).not.toBe('dark')

      // open_palm -> pinch is a gesture change, so pinch fires once.
      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(true)
    })

    it('null -> null never fires any setter', () => {
      const last = applyGestureEdge(null, null)
      expect(useStore.getState().renderMode).toBe('radio')
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)
      expect(last).toBe(null)
    })
  })
})
