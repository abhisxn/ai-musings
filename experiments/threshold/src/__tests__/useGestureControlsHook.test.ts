/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, RENDER_MODES, THEMES_LIST, type RenderMode, type Theme } from '../store'
import { nextRenderMode, prevRenderMode, nextTheme, nextMoodEnabled } from '../useGestureControls'
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
    viewMode: 'flat',
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
        s.setViewMode(s.viewMode === 'flat' ? 'volumetric' : 'flat')
        break
      case 'open_palm':
        s.setMoodEnabled(nextMoodEnabled(s.moodEnabled))
        break
      case 'pinch':
        // reserved
        break
      case 'thumb_up':
        s.setRenderMode(nextRenderMode(s.renderMode))
        break
      case 'thumb_down':
        s.setRenderMode(prevRenderMode(s.renderMode))
        break
    }
  }
  return gesture
}

describe('useGestureControls — edge detection + dispatch (store-driven)', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('FIST -> toggle viewMode', () => {
    it('fires setViewMode exactly once on null -> fist', () => {
      const before = useStore.getState().viewMode
      const last = applyGestureEdge(null, 'fist')
      expect(useStore.getState().viewMode).toBe(before === 'flat' ? 'volumetric' : 'flat')
      expect(last).toBe('fist')
    })

    it('does NOT re-fire on fist -> fist', () => {
      const last = applyGestureEdge(null, 'fist')
      const firedMode = useStore.getState().viewMode
      applyGestureEdge(last, 'fist')
      expect(useStore.getState().viewMode).toBe(firedMode)
    })
  })

  describe('THUMB_UP -> cycle render mode forward', () => {
    it('fires setRenderMode exactly once on null -> thumb_up (advancing one step in RENDER_MODES)', () => {
      const startMode = useStore.getState().renderMode
      const idxBefore = RENDER_MODES.indexOf(startMode)
      const expected = RENDER_MODES[(idxBefore + 1) % RENDER_MODES.length]

      const last = applyGestureEdge(null, 'thumb_up')

      expect(useStore.getState().renderMode).toBe(expected)
      expect(last).toBe('thumb_up')
    })

    it('does NOT re-fire on thumb_up -> thumb_up (same gesture held)', () => {
      const last = applyGestureEdge(null, 'thumb_up')
      const firedMode = useStore.getState().renderMode

      applyGestureEdge(last, 'thumb_up')

      expect(useStore.getState().renderMode).toBe(firedMode)
    })

    it('fires once per null -> thumb_up -> null -> thumb_up cycle (no rapid-fire on held gesture)', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'thumb_up')
      const afterFirst = useStore.getState().renderMode
      expect(afterFirst).not.toBe('radio')

      last = applyGestureEdge(last, 'thumb_up')
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, null)
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, 'thumb_up')
      const afterSecond = useStore.getState().renderMode
      expect(afterSecond).toBe(nextRenderMode(afterFirst))
      expect(afterSecond).not.toBe(afterFirst)
    })
  })

  describe('THUMB_DOWN -> cycle render mode backward', () => {
    it('fires setRenderMode exactly once on null -> thumb_down (stepping back one step in RENDER_MODES)', () => {
      const startMode = useStore.getState().renderMode
      const idxBefore = RENDER_MODES.indexOf(startMode)
      const expected = RENDER_MODES[(idxBefore - 1 + RENDER_MODES.length) % RENDER_MODES.length]

      const last = applyGestureEdge(null, 'thumb_down')

      expect(useStore.getState().renderMode).toBe(expected)
      expect(last).toBe('thumb_down')
    })

    it('does NOT re-fire on thumb_down -> thumb_down (same gesture held)', () => {
      const last = applyGestureEdge(null, 'thumb_down')
      const firedMode = useStore.getState().renderMode

      applyGestureEdge(last, 'thumb_down')

      expect(useStore.getState().renderMode).toBe(firedMode)
    })

    it('fires once per null -> thumb_down -> null -> thumb_down cycle (no rapid-fire on held gesture)', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'thumb_down')
      const afterFirst = useStore.getState().renderMode
      expect(afterFirst).not.toBe('radio')

      last = applyGestureEdge(last, 'thumb_down')
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, null)
      expect(useStore.getState().renderMode).toBe(afterFirst)

      last = applyGestureEdge(last, 'thumb_down')
      const afterSecond = useStore.getState().renderMode
      expect(afterSecond).toBe(prevRenderMode(afterFirst))
      expect(afterSecond).not.toBe(afterFirst)
    })
  })

  describe('OPEN_PALM -> toggle moodEnabled', () => {
    it('fires setMoodEnabled exactly once on null -> open_palm (toggling false -> true)', () => {
      expect(useStore.getState().moodEnabled).toBe(false)

      const last = applyGestureEdge(null, 'open_palm')

      expect(useStore.getState().moodEnabled).toBe(true)
      expect(last).toBe('open_palm')
    })

    it('does NOT re-fire on open_palm -> open_palm (no rapid toggle)', () => {
      const last = applyGestureEdge(null, 'open_palm')
      expect(useStore.getState().moodEnabled).toBe(true)

      applyGestureEdge(last, 'open_palm')

      expect(useStore.getState().moodEnabled).toBe(true)
    })

    it('toggles again only after returning through null', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, null)
      expect(useStore.getState().moodEnabled).toBe(true)

      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().moodEnabled).toBe(false)
    })
  })

  describe('PINCH -> reserved (no-op)', () => {
    it('does NOT fire any setter on null -> pinch', () => {
      const modeBefore = useStore.getState().renderMode
      const themeBefore = useStore.getState().theme
      const moodBefore = useStore.getState().moodEnabled
      const viewBefore = useStore.getState().viewMode

      const last = applyGestureEdge(null, 'pinch')

      expect(useStore.getState().renderMode).toBe(modeBefore)
      expect(useStore.getState().theme).toBe(themeBefore)
      expect(useStore.getState().moodEnabled).toBe(moodBefore)
      expect(useStore.getState().viewMode).toBe(viewBefore)
      expect(last).toBe('pinch')
    })

    it('does NOT re-fire on pinch -> pinch', () => {
      const last = applyGestureEdge(null, 'pinch')
      const modeBefore = useStore.getState().renderMode
      const themeBefore = useStore.getState().theme
      const moodBefore = useStore.getState().moodEnabled
      const viewBefore = useStore.getState().viewMode

      applyGestureEdge(last, 'pinch')

      expect(useStore.getState().renderMode).toBe(modeBefore)
      expect(useStore.getState().theme).toBe(themeBefore)
      expect(useStore.getState().moodEnabled).toBe(moodBefore)
      expect(useStore.getState().viewMode).toBe(viewBefore)
    })
  })

  describe('edge semantics across gestures', () => {
    it('null -> gesture fires; gesture -> same gesture does NOT fire; gesture -> null -> different gesture fires once', () => {
      let last: Gesture = null

      // null -> thumb_up fires render mode only
      last = applyGestureEdge(last, 'thumb_up')
      const modeAfterThumbUp = useStore.getState().renderMode
      const themeAfterThumbUp = useStore.getState().theme
      const moodAfterThumbUp = useStore.getState().moodEnabled
      const viewAfterThumbUp = useStore.getState().viewMode
      expect(modeAfterThumbUp).not.toBe('radio')
      expect(themeAfterThumbUp).toBe('dark')
      expect(moodAfterThumbUp).toBe(false)
      expect(viewAfterThumbUp).toBe('flat')

      // thumb_up -> thumb_up: nothing fires
      last = applyGestureEdge(last, 'thumb_up')
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)
      expect(useStore.getState().viewMode).toBe('flat')

      // thumb_up -> null: no dispatch (null guard), just updates last
      last = applyGestureEdge(last, null)
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)
      expect(useStore.getState().viewMode).toBe('flat')

      // null -> open_palm fires mood only
      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(true)
      expect(useStore.getState().viewMode).toBe('flat')

      // open_palm -> null -> fist fires viewMode only
      last = applyGestureEdge(last, null)
      last = applyGestureEdge(last, 'fist')
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(true)
      expect(useStore.getState().viewMode).toBe('volumetric')

      // fist -> null -> pinch is a no-op (reserved)
      last = applyGestureEdge(last, null)
      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(true)
      expect(useStore.getState().viewMode).toBe('volumetric')
    })

    it('a different gesture immediately after another (no null gap) fires the new dispatch once', () => {
      let last: Gesture = null
      last = applyGestureEdge(last, 'thumb_up')
      const modeAfterThumbUp = useStore.getState().renderMode

      // thumb_up -> open_palm is a gesture change (not equal), so open_palm fires once.
      last = applyGestureEdge(last, 'open_palm')
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
      expect(useStore.getState().moodEnabled).toBe(true)

      // open_palm -> pinch is a gesture change, but pinch is reserved (no-op).
      last = applyGestureEdge(last, 'pinch')
      expect(useStore.getState().moodEnabled).toBe(true)
      expect(useStore.getState().renderMode).toBe(modeAfterThumbUp)
    })

    it('null -> null never fires any setter', () => {
      const last = applyGestureEdge(null, null)
      expect(useStore.getState().renderMode).toBe('radio')
      expect(useStore.getState().theme).toBe('dark')
      expect(useStore.getState().moodEnabled).toBe(false)
      expect(useStore.getState().viewMode).toBe('flat')
      expect(last).toBe(null)
    })
  })
})
