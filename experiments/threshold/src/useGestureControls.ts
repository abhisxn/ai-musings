'use client'

/**
 * Gesture-reactive controls (Phase 3, Track B).
 *
 * Subscribes to the one-shot, edge-triggered `handTracking.gesture` written by
 * `vision/useGestureTracking` (a gesture is reported ONLY on the frame it's
 * entered — see `detectGestureEdge` in `vision/pinch.ts`) and advances the
 * render mode / theme or toggles the session-arc (mood) on that enter edge.
 *
 * A ref mirrors the last-seen gesture so we act strictly on the null -> gesture
 * transition, matching the existing one-shot semantics rather than adding any
 * new debouncing that would alter edge behavior.
 */

import { useEffect, useRef } from 'react'
import { useStore, RENDER_MODES, THEMES_LIST, type RenderMode, type Theme } from './store'
import type { Gesture } from './vision/pinch'

/** Advance to the next render mode, wrapping modulo RENDER_MODES. */
export function nextRenderMode(current: RenderMode): RenderMode {
  const idx = RENDER_MODES.indexOf(current)
  return RENDER_MODES[(idx + 1) % RENDER_MODES.length]
}

/** Advance to the next theme, wrapping modulo THEMES_LIST. */
export function nextTheme(current: Theme): Theme {
  const idx = THEMES_LIST.indexOf(current)
  return THEMES_LIST[(idx + 1) % THEMES_LIST.length]
}

/** Toggle the session-arc (mood) boolean on a PINCH enter edge. */
export function nextMoodEnabled(current: boolean): boolean {
  return !current
}

/**
 * On each non-null gesture enter edge, fire the mapped action:
 *   FIST      -> cycle render mode
 *   OPEN_PALM -> cycle theme
 *   PINCH     -> toggle session-arc (moodEnabled)
 */
export function useGestureControls(): void {
  const gesture = useStore((s) => s.handTracking.gesture)
  const renderMode = useStore((s) => s.renderMode)
  const setRenderMode = useStore((s) => s.setRenderMode)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const moodEnabled = useStore((s) => s.moodEnabled)
  const setMoodEnabled = useStore((s) => s.setMoodEnabled)

  const lastGesture = useRef<Gesture>(null)

  useEffect(() => {
    // Only act on the null -> gesture enter edge.
    if (gesture === lastGesture.current) return
    if (gesture !== null) {
      switch (gesture) {
        case 'fist':
          setRenderMode(nextRenderMode(renderMode))
          break
        case 'open_palm':
          setTheme(nextTheme(theme))
          break
        case 'pinch':
          setMoodEnabled(nextMoodEnabled(moodEnabled))
          break
      }
    }
    lastGesture.current = gesture
  }, [gesture, renderMode, theme, moodEnabled, setRenderMode, setTheme, setMoodEnabled])
}
