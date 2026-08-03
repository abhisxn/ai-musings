/// <reference types="vitest/globals" />
import { BLEED_SKEW_FLAT, BLEED_SKEW_VOLUMETRIC } from '../bleedSkew'

describe('BLEED_SKEW constants', () => {
  it('BLEED_SKEW_FLAT is a plain translate that centers the bleed stage', () => {
    expect(BLEED_SKEW_FLAT).toBe('translate(-50%, -50%)')
  })

  it('BLEED_SKEW_VOLUMETRIC includes a perspective transform', () => {
    expect(BLEED_SKEW_VOLUMETRIC).toMatch(/perspective\(/)
  })

  it('BLEED_SKEW_VOLUMETRIC includes an X-axis rotation', () => {
    expect(BLEED_SKEW_VOLUMETRIC).toMatch(/rotateX\(/)
  })

  it('BLEED_SKEW_VOLUMETRIC includes a Y-axis rotation', () => {
    expect(BLEED_SKEW_VOLUMETRIC).toMatch(/rotateY\(/)
  })

  it('BLEED_SKEW_VOLUMETRIC preserves the centered translate so the stage stays positioned', () => {
    expect(BLEED_SKEW_VOLUMETRIC).toMatch(/translate\(-50%, -50%\)/)
  })

  it('BLEED_SKEW_FLAT does not include perspective or rotation', () => {
    expect(BLEED_SKEW_FLAT).not.toMatch(/perspective\(/)
    expect(BLEED_SKEW_FLAT).not.toMatch(/rotate/)
  })
})
