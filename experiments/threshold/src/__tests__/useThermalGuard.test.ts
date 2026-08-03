import { describe, it, expect, afterEach } from 'vitest'
import {
  estimateFrameMs,
  classifyRisk,
  readDeviceInfo,
  THERMAL_DEFAULTS,
  BASE_FRAME_MS,
  MS_PER_POSTPROCESS_PASS,
  MS_PER_INSTANCE_MESH,
  MS_PER_RAF_LOOP,
  GPU_THERMAL_LIMIT_MS,
  GPU_MEDIUM_LIMIT_MS,
  LOW_MEMORY_GB,
  MEDIUM_MEMORY_GB,
} from '../useThermalGuard'

describe('useThermalGuard', () => {
  describe('estimateFrameMs', () => {
    it('computes total cost as the sum of all components', () => {
      const ms = estimateFrameMs(THERMAL_DEFAULTS)
      expect(ms).toBeCloseTo(
        BASE_FRAME_MS +
          MS_PER_POSTPROCESS_PASS * 8 +
          MS_PER_INSTANCE_MESH * 9 * 1.0 +
          MS_PER_RAF_LOOP * 4,
        5,
      )
    })

    it('exceeds the thermal limit at baseline defaults (motivates the sprint)', () => {
      const ms = estimateFrameMs(THERMAL_DEFAULTS)
      expect(ms).toBeGreaterThan(GPU_THERMAL_LIMIT_MS)
    })

    it('scales up with resolution', () => {
      const base = estimateFrameMs({ ...THERMAL_DEFAULTS, resolution: 64 })
      const high = estimateFrameMs({ ...THERMAL_DEFAULTS, resolution: 128 })
      expect(high).toBeGreaterThan(base)
    })

    it('scales down with fewer post-process passes', () => {
      const full = estimateFrameMs({ ...THERMAL_DEFAULTS, postProcessCount: 8 })
      const reduced = estimateFrameMs({ ...THERMAL_DEFAULTS, postProcessCount: 3 })
      expect(reduced).toBeLessThan(full)
    })

    it('scales down with fewer instance meshes', () => {
      const full = estimateFrameMs({ ...THERMAL_DEFAULTS, instanceMeshCount: 9 })
      const reduced = estimateFrameMs({ ...THERMAL_DEFAULTS, instanceMeshCount: 1 })
      expect(reduced).toBeLessThan(full)
    })

    it('scales down with fewer rAF loops', () => {
      const full = estimateFrameMs({ ...THERMAL_DEFAULTS, rAFLoopCount: 4 })
      const reduced = estimateFrameMs({ ...THERMAL_DEFAULTS, rAFLoopCount: 1 })
      expect(reduced).toBeLessThan(full)
    })
  })

  describe('classifyRisk', () => {
    it('returns high when frame cost exceeds the thermal limit', () => {
      expect(classifyRisk(GPU_THERMAL_LIMIT_MS + 0.01, null)).toBe('high')
      expect(classifyRisk(20, null)).toBe('high')
    })

    it('returns medium when frame cost exceeds the medium limit', () => {
      expect(classifyRisk(GPU_MEDIUM_LIMIT_MS + 0.01, null)).toBe('medium')
      expect(classifyRisk(10, null)).toBe('medium')
    })

    it('returns low when frame cost is within the medium budget', () => {
      expect(classifyRisk(5, null)).toBe('low')
      expect(classifyRisk(GPU_MEDIUM_LIMIT_MS, null)).toBe('low')
    })

    it('returns high when deviceMemory < 4 GB regardless of frame cost', () => {
      expect(classifyRisk(5, 2)).toBe('high')
      expect(classifyRisk(5, LOW_MEMORY_GB - 0.1)).toBe('high')
    })

    it('returns medium when deviceMemory is 4-8 GB and frame cost is low', () => {
      expect(classifyRisk(5, 4)).toBe('medium')
      expect(classifyRisk(5, 6)).toBe('medium')
    })

    it('returns low when deviceMemory >= 8 GB and frame cost is low', () => {
      expect(classifyRisk(5, 8)).toBe('low')
      expect(classifyRisk(5, 16)).toBe('low')
    })

    it('takes the worst risk across frame cost and memory', () => {
      expect(classifyRisk(15, 2)).toBe('high')
      expect(classifyRisk(10, 2)).toBe('high')
      expect(classifyRisk(5, 2)).toBe('high')
    })

    it('treats null deviceMemory as unknown (no memory-based downgrade)', () => {
      expect(classifyRisk(5, null)).toBe('low')
      expect(classifyRisk(10, null)).toBe('medium')
      expect(classifyRisk(15, null)).toBe('high')
    })

    it('classifies baseline defaults as high risk', () => {
      const ms = estimateFrameMs(THERMAL_DEFAULTS)
      expect(classifyRisk(ms, null)).toBe('high')
    })
  })

  describe('readDeviceInfo', () => {
    const originalDeviceMemory = (navigator as any).deviceMemory
    const originalHardwareConcurrency = (navigator as any).hardwareConcurrency

    afterEach(() => {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: originalDeviceMemory,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: originalHardwareConcurrency,
        configurable: true,
        writable: true,
      })
    })

    it('reads deviceMemory when present', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true, writable: true })
      expect(readDeviceInfo().deviceMemoryGB).toBe(8)
    })

    it('returns null for deviceMemory when undefined', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: undefined, configurable: true, writable: true })
      expect(readDeviceInfo().deviceMemoryGB).toBeNull()
    })

    it('reads hardwareConcurrency when present', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true, writable: true })
      expect(readDeviceInfo().hardwareConcurrency).toBe(8)
    })

    it('returns null for hardwareConcurrency when undefined', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: undefined, configurable: true, writable: true })
      expect(readDeviceInfo().hardwareConcurrency).toBeNull()
    })

    it('returns null for both when navigator properties absent', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: undefined, configurable: true, writable: true })
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: undefined, configurable: true, writable: true })
      const info = readDeviceInfo()
      expect(info.deviceMemoryGB).toBeNull()
      expect(info.hardwareConcurrency).toBeNull()
    })
  })
})
