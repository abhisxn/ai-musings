import { describe, expect, it } from 'vitest'
import { assetPath } from './assetPath'

describe('assetPath', () => {
  it('prefixes relative paths with the basePath', () => {
    expect(assetPath('/experiments/threshold/thumbnail.svg')).toBe('/musings/experiments/threshold/thumbnail.svg')
  })

  it('returns absolute URLs unchanged', () => {
    expect(assetPath('https://example.com/image.png')).toBe('https://example.com/image.png')
  })

  it('returns already-prefixed paths unchanged', () => {
    expect(assetPath('/musings/experiments/threshold/hero.svg')).toBe('/musings/experiments/threshold/hero.svg')
  })
})
