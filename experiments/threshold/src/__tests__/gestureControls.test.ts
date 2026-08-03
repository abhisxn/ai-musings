/// <reference types="vitest/globals" />
import { nextRenderMode, prevRenderMode, nextTheme, nextMoodEnabled } from '../useGestureControls'
import { RENDER_MODES, THEMES_LIST, type RenderMode, type Theme } from '../store'

describe('nextRenderMode', () => {
  it('advances to the next render mode in RENDER_MODES order', () => {
    expect(nextRenderMode('radio')).toBe('dots')
    expect(nextRenderMode('dots')).toBe('blocks')
  })

  it('wraps from the last render mode back to the first', () => {
    const last = RENDER_MODES[RENDER_MODES.length - 1] as RenderMode
    expect(nextRenderMode(last)).toBe(RENDER_MODES[0])
  })

  it('is a full single-cycle permutation over every render mode', () => {
    let current: RenderMode = RENDER_MODES[0]
    const visited: RenderMode[] = []
    for (let i = 0; i < RENDER_MODES.length; i++) {
      visited.push(current)
      current = nextRenderMode(current)
    }
    expect(new Set(visited).size).toBe(RENDER_MODES.length)
    expect(current).toBe(RENDER_MODES[0])
  })
})

describe('prevRenderMode', () => {
  it('steps to the previous render mode in RENDER_MODES order', () => {
    expect(prevRenderMode('dots')).toBe('radio')
    expect(prevRenderMode('blocks')).toBe('dots')
  })

  it('wraps from the first render mode back to the last', () => {
    const first = RENDER_MODES[0] as RenderMode
    const last = RENDER_MODES[RENDER_MODES.length - 1] as RenderMode
    expect(prevRenderMode(first)).toBe(last)
  })

  it('is the inverse of nextRenderMode over a full cycle', () => {
    let current: RenderMode = RENDER_MODES[0]
    for (let i = 0; i < RENDER_MODES.length; i++) {
      current = nextRenderMode(current)
    }
    expect(current).toBe(RENDER_MODES[0])
    for (let i = 0; i < RENDER_MODES.length; i++) {
      current = prevRenderMode(current)
    }
    expect(current).toBe(RENDER_MODES[0])
  })
})

describe('nextTheme', () => {
  it('advances to the next theme in THEMES_LIST order', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('acid')
  })

  it('wraps from the last theme back to the first', () => {
    const last = THEMES_LIST[THEMES_LIST.length - 1] as Theme
    expect(nextTheme(last)).toBe(THEMES_LIST[0])
  })

  it('visits every theme exactly once per full cycle', () => {
    let current: Theme = THEMES_LIST[0]
    const visited: Theme[] = []
    for (let i = 0; i < THEMES_LIST.length; i++) {
      visited.push(current)
      current = nextTheme(current)
    }
    expect(new Set(visited).size).toBe(THEMES_LIST.length)
    expect(current).toBe(THEMES_LIST[0])
  })
})

describe('nextMoodEnabled (PINCH toggle)', () => {
  it('flips false to true', () => {
    expect(nextMoodEnabled(false)).toBe(true)
  })

  it('flips true to false', () => {
    expect(nextMoodEnabled(true)).toBe(false)
  })

  it('is a clean two-state oscillation across repeated toggles', () => {
    let state = false
    for (let i = 0; i < 6; i++) state = nextMoodEnabled(state)
    expect(state).toBe(false)
    state = nextMoodEnabled(state)
    expect(state).toBe(true)
  })
})
