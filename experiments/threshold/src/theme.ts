import * as THREE from 'three'
import { Phase } from './types'

export type ThresholdTheme = 'dark' | 'light' | 'acid' | 'heatmap' | 'cyber' | 'sunset' | 'ir' | 'matrix' | 'noir'

export interface ThemePalette {
  background: string
  accent: string
  accentDim: string
  label: string
  gradient: string[]
  accents: string[]
  blend: 'split' | 'gradient' | 'parallel' | 'glitch'
}

export const THEMES: Record<ThresholdTheme, ThemePalette> = {
  dark:    { background: '#050505', accent: '#00ff41', accentDim: '#00ff4166', label: 'DARK',   gradient: ['#031a0d', '#00ff41'], accents: ['#00ff41'], blend: 'gradient' },
  light:   { background: '#050505', accent: '#f5f5f5', accentDim: '#f5f5f566', label: 'LIGHT',  gradient: ['#0a0a0a', '#f5f5f5'], accents: ['#f5f5f5'], blend: 'gradient' },
  acid:    { background: '#050505', accent: '#ccff00', accentDim: '#ccff0066', label: 'ACID',   gradient: ['#1a1f00', '#ccff00'], accents: ['#ccff00'], blend: 'gradient' },
  heatmap: { background: '#050505', accent: '#ff003c', accentDim: '#ff003c66', label: 'HEAT',   gradient: ['#0033ff', '#00e5ff', '#00ff41', '#ffee00', '#ff003c'], accents: ['#0033ff', '#00e5ff', '#00ff41', '#ffee00', '#ff003c'], blend: 'gradient' },
  cyber:   { background: '#050510', accent: '#00ffff', accentDim: '#00ffff66', label: 'CYBER',  gradient: ['#00ffff', '#ff00ff'], accents: ['#00ffff', '#ff00ff'], blend: 'glitch' },
  sunset:  { background: '#0a0500', accent: '#ff4400', accentDim: '#ff440066', label: 'SUNSET', gradient: ['#ff4400', '#ff00aa', '#aa00ff'], accents: ['#ff4400', '#ff00aa', '#aa00ff'], blend: 'gradient' },
  ir:      { background: '#050000', accent: '#ff2200', accentDim: '#ff220066', label: 'IR',     gradient: ['#ff2200', '#ffaa00', '#ffffff'], accents: ['#ff2200', '#ffaa00', '#ffffff'], blend: 'gradient' },
  matrix:  { background: '#000a00', accent: '#00ff41', accentDim: '#00ff4166', label: 'MATRIX', gradient: ['#00ff41', '#00cc00'], accents: ['#00ff41', '#00ff41', '#003300'], blend: 'parallel' },
  noir:    { background: '#000000', accent: '#ffffff', accentDim: '#ffffff66', label: 'NOIR',   gradient: ['#222222', '#888888', '#ffffff'], accents: ['#222222', '#888888', '#ffffff'], blend: 'gradient' },
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

// Phase 6 multi-accent gradient: lerps through `accents[1..n]` instead of the
// legacy `gradient` stops. Behavior matches the `blend` mode declared on the
// theme:
//   - gradient: classic multi-stop lerp (default).
//   - split:    0..0.5 lerps accent[0]→accent[1]; 0.5..1 lerps accent[1]→accent[2]
//               (or stops at accent[1] for 2-accent themes).
//   - parallel: not yet wired; falls back to gradient (the visual parallel
//               scanline effect is owned by the renderer for matrix theme).
//   - glitch:   not yet wired; falls back to gradient.
export function getAccentGradientColor(
  theme: ThresholdTheme,
  brightness: number,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const palette = THEMES[theme]
  const b = Math.min(1, Math.max(0, brightness))
  const accents = palette.accents
  if (accents.length === 1) return target.set(accents[0])
  if (palette.blend === 'split' && accents.length >= 2) {
    if (b < 0.5) {
      return new THREE.Color(accents[0]).lerp(new THREE.Color(accents[1]), b * 2).copy(target)
    } else if (accents.length >= 3) {
      return new THREE.Color(accents[1]).lerp(new THREE.Color(accents[2]), (b - 0.5) * 2).copy(target)
    }
    return target.set(accents[1])
  }
  // default: multi-stop lerp through `accents`
  const t = b * (accents.length - 1)
  const i = Math.min(accents.length - 2, Math.floor(t))
  const frac = t - i
  return target.set(accents[i]).lerp(new THREE.Color(accents[i + 1]), frac)
}
