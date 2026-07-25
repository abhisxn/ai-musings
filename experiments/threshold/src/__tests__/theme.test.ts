/// <reference types="vitest/globals" />
import * as THREE from 'three'
import { getTheme, getGradientColor, THEMES, PHASE_COLORS, PHASE_LABELS } from '../theme'

describe('getTheme', () => {
  it('returns the dark palette with expected fields', () => {
    const t = getTheme('dark')
    expect(t.background).toBe('#050505')
    expect(t.accent).toBe('#00ff41')
    expect(t.accentDim).toBe('#00ff4166')
    expect(t.label).toBe('DARK')
    expect(t.gradient).toEqual(['#031a0d', '#00ff41'])
  })

  it('returns the light palette with expected fields', () => {
    const t = getTheme('light')
    expect(t.background).toBe('#050505')
    expect(t.accent).toBe('#f5f5f5')
    expect(t.gradient).toEqual(['#0a0a0a', '#f5f5f5'])
  })

  it('returns the acid palette with expected fields', () => {
    const t = getTheme('acid')
    expect(t.accent).toBe('#ccff00')
    expect(t.label).toBe('ACID')
    expect(t.gradient).toEqual(['#1a1f00', '#ccff00'])
  })

  it('returns the heatmap palette with a 5-stop gradient', () => {
    const t = getTheme('heatmap')
    expect(t.accent).toBe('#ff003c')
    expect(t.label).toBe('HEAT')
    expect(t.gradient).toEqual(['#0033ff', '#00e5ff', '#00ff41', '#ffee00', '#ff003c'])
  })

  it('exposes exactly four themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['acid', 'dark', 'heatmap', 'light'])
  })
})

describe('getGradientColor', () => {
  const roundRgb = (c: THREE.Color) =>
    [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]

  it('clamps brightness below 0 to the first stop', () => {
    expect(roundRgb(getGradientColor('heatmap', -0.5))).toEqual(roundRgb(new THREE.Color('#0033ff')))
  })

  it('clamps brightness above 1 to the last stop', () => {
    expect(roundRgb(getGradientColor('heatmap', 1.5))).toEqual(roundRgb(new THREE.Color('#ff003c')))
  })

  it('resolves brightness 0 to the first stop for every theme', () => {
    expect(roundRgb(getGradientColor('dark', 0))).toEqual(roundRgb(new THREE.Color('#031a0d')))
    expect(roundRgb(getGradientColor('light', 0))).toEqual(roundRgb(new THREE.Color('#0a0a0a')))
    expect(roundRgb(getGradientColor('acid', 0))).toEqual(roundRgb(new THREE.Color('#1a1f00')))
    expect(roundRgb(getGradientColor('heatmap', 0))).toEqual(roundRgb(new THREE.Color('#0033ff')))
  })

  it('resolves brightness 1 to the last stop for every theme', () => {
    expect(roundRgb(getGradientColor('dark', 1))).toEqual(roundRgb(new THREE.Color('#00ff41')))
    expect(roundRgb(getGradientColor('light', 1))).toEqual(roundRgb(new THREE.Color('#f5f5f5')))
    expect(roundRgb(getGradientColor('acid', 1))).toEqual(roundRgb(new THREE.Color('#ccff00')))
    expect(roundRgb(getGradientColor('heatmap', 1))).toEqual(roundRgb(new THREE.Color('#ff003c')))
  })

  it('interpolates the midpoint of a 2-stop gradient linearly', () => {
    const c = getGradientColor('dark', 0.5)
    const lo = new THREE.Color('#031a0d')
    const hi = new THREE.Color('#00ff41')
    expect(c.r).toBeCloseTo((lo.r + hi.r) / 2, 5)
    expect(c.g).toBeCloseTo((lo.g + hi.g) / 2, 5)
    expect(c.b).toBeCloseTo((lo.b + hi.b) / 2, 5)
  })

  it('resolves heatmap brightness 0.5 exactly to the third (middle) stop', () => {
    // 5 stops -> 4 segments; 0.5 * 4 = 2 -> segment index 2 -> between stop[2] and stop[3] at frac 0
    expect(roundRgb(getGradientColor('heatmap', 0.5))).toEqual(roundRgb(new THREE.Color('#00ff41')))
  })

  it('interpolates heatmap across the 5-stop turbo ramp at 0.25 and 0.75', () => {
    // 0.25 * 4 = 1 -> between stop[1] (#00e5ff) and stop[2] (#00ff41) at frac 0 -> stop[1]
    expect(roundRgb(getGradientColor('heatmap', 0.25))).toEqual(roundRgb(new THREE.Color('#00e5ff')))
    // 0.75 * 4 = 3 -> between stop[3] (#ffee00) and stop[4] (#ff003c) at frac 0 -> stop[3]
    expect(roundRgb(getGradientColor('heatmap', 0.75))).toEqual(roundRgb(new THREE.Color('#ffee00')))
  })

  it('interpolates heatmap at 0.125 (midpoint of first segment)', () => {
    // 0.125 * 4 = 0.5 -> segment 0, frac 0.5 -> midpoint of #0033ff and #00e5ff
    const c = getGradientColor('heatmap', 0.125)
    const lo = new THREE.Color('#0033ff')
    const hi = new THREE.Color('#00e5ff')
    expect(c.r).toBeCloseTo((lo.r + hi.r) / 2, 5)
    expect(c.g).toBeCloseTo((lo.g + hi.g) / 2, 5)
    expect(c.b).toBeCloseTo((lo.b + hi.b) / 2, 5)
  })
})

describe('PHASE_COLORS', () => {
  it('maps each Phase to its accent color', () => {
    expect(PHASE_COLORS.calm).toBe('#00ff41')
    expect(PHASE_COLORS.active).toBe('#ffff00')
    expect(PHASE_COLORS.climax).toBe('#ff4444')
  })
})

describe('PHASE_LABELS', () => {
  it('maps each Phase to its display label', () => {
    expect(PHASE_LABELS.calm).toBe('CALM')
    expect(PHASE_LABELS.active).toBe('BUILDING')
    expect(PHASE_LABELS.climax).toBe('CLIMAX')
  })
})
