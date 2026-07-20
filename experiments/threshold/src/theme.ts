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

export function getTheme(theme: ThresholdTheme): ThemePalette {
  return THEMES[theme]
}

export function getGradientColor(theme: ThresholdTheme, brightness: number): THREE.Color {
  const palette = THEMES[theme]
  const stops = palette.gradient
  const b = Math.min(1, Math.max(0, brightness))
  if (stops.length === 1) return new THREE.Color(stops[0])
  const t = b * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(t))
  const frac = t - i
  const a = new THREE.Color(stops[i])
  const c = new THREE.Color(stops[i + 1])
  return a.lerp(c, frac)
}
