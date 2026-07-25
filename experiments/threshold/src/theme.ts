import * as THREE from 'three'
import { Phase } from './types'

export type ThresholdTheme = 'dark' | 'light' | 'acid' | 'heatmap'

export interface ThemePalette {
  background: string
  accent: string
  accentDim: string
  label: string
  gradient: string[]
}

export const THEMES: Record<ThresholdTheme, ThemePalette> = {
  dark:    { background: '#050505', accent: '#00ff41', accentDim: '#00ff4166', label: 'DARK',  gradient: ['#031a0d', '#00ff41'] },
  light:   { background: '#050505', accent: '#f5f5f5', accentDim: '#f5f5f566', label: 'LIGHT', gradient: ['#0a0a0a', '#f5f5f5'] },
  acid:    { background: '#050505', accent: '#ccff00', accentDim: '#ccff0066', label: 'ACID',  gradient: ['#1a1f00', '#ccff00'] },
  heatmap: { background: '#050505', accent: '#ff003c', accentDim: '#ff003c66', label: 'HEAT',  gradient: ['#0033ff', '#00e5ff', '#00ff41', '#ffee00', '#ff003c'] },
}

export const PHASE_COLORS: Record<Phase, string> = {
  calm: '#00ff41',
  active: '#ffff00',
  climax: '#ff4444',
}

export const PHASE_LABELS: Record<Phase, string> = {
  calm: 'CALM',
  active: 'BUILDING',
  climax: 'CLIMAX',
}

export function getTheme(theme: ThresholdTheme): ThemePalette {
  return THEMES[theme]
}

// Gradient stops pre-converted to THREE.Color once (per theme) so the hot
// per-cell path avoids hex-string parsing + allocations on every call.
const THEME_STOPS = Object.fromEntries(
  (Object.keys(THEMES) as ThresholdTheme[]).map((k) => [
    k,
    THEMES[k].gradient.map((h) => new THREE.Color(h)),
  ]),
) as Record<ThresholdTheme, THREE.Color[]>

// `target` lets hot-path callers pass a reusable scratch THREE.Color (zero
// per-call allocation). Omit it to get a fresh Color (existing API / tests).
export function getGradientColor(
  theme: ThresholdTheme,
  brightness: number,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const stops = THEME_STOPS[theme]
  const b = Math.min(1, Math.max(0, brightness))
  if (stops.length === 1) return target.copy(stops[0])
  const t = b * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(t))
  const frac = t - i
  return target.copy(stops[i]).lerp(stops[i + 1], frac)
}

// HSL-based color for mood mode: fixed hue per mood, brightness drives lightness.
// Mirrors getGradientColor's signature (reusable `target` for the hot per-cell path).
export function getMoodGradientColor(
  baseHue: number,
  brightness: number,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const b = Math.min(1, Math.max(0, brightness))
  return target.setHSL(baseHue / 360, 0.75, 0.08 + b * 0.42)
}
