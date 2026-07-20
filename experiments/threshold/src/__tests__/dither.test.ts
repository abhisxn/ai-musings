/// <reference types="vitest/globals" />
import { bayerMatrix } from '../dither'

describe('bayerMatrix', () => {
  it('returns the canonical 2x2 Bayer matrix for n=1', () => {
    expect(bayerMatrix(1)).toEqual([[0, 2], [3, 1]])
  })

  it('returns the canonical 4x4 Bayer matrix for n=2', () => {
    expect(bayerMatrix(2)).toEqual([
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ])
  })

  it('produces a 2^n x 2^n matrix', () => {
    const m3 = bayerMatrix(3)
    expect(m3.length).toBe(8)
    for (const row of m3) expect(row.length).toBe(8)
  })

  it('contains each value 0..2^(2n)-1 exactly once', () => {
    const n = 3
    const m = bayerMatrix(n)
    const size = 1 << n
    const seen = new Set<number>()
    for (const row of m) for (const v of row) seen.add(v)
    expect(seen.size).toBe(size * size)
    expect(Math.min(...Array.from(seen))).toBe(0)
    expect(Math.max(...Array.from(seen))).toBe(size * size - 1)
  })

  it('places the recursive quadrants correctly for n=2', () => {
    const m = bayerMatrix(2)
    // top-left = 4 * bayer(1)
    expect(m[0][0]).toBe(0)
    expect(m[0][1]).toBe(8)
    expect(m[1][0]).toBe(12)
    expect(m[1][1]).toBe(4)
    // top-right = 4 * bayer(1) + 2
    expect(m[0][2]).toBe(2)
    expect(m[0][3]).toBe(10)
    expect(m[1][2]).toBe(14)
    expect(m[1][3]).toBe(6)
    // bottom-left = 4 * bayer(1) + 3
    expect(m[2][0]).toBe(3)
    expect(m[2][1]).toBe(11)
    expect(m[3][0]).toBe(15)
    expect(m[3][1]).toBe(7)
    // bottom-right = 4 * bayer(1) + 1
    expect(m[2][2]).toBe(1)
    expect(m[2][3]).toBe(9)
    expect(m[3][2]).toBe(13)
    expect(m[3][3]).toBe(5)
  })
})
