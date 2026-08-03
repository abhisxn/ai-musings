'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore, computeEffectiveResolution } from './store'

export type ThermalRisk = 'low' | 'medium' | 'high'

export interface ThermalGuardParams {
  resolution: number
  postProcessCount: number
  instanceMeshCount: number
  rAFLoopCount: number
}

export interface ThermalGuardResult {
  thermalRisk: ThermalRisk
  estimatedFrameMs: number
  deviceMemoryGB: number | null
}

export interface DeviceInfo {
  deviceMemoryGB: number | null
  hardwareConcurrency: number | null
}

export const THERMAL_DEFAULTS: ThermalGuardParams = {
  resolution: 64,
  postProcessCount: 8,
  instanceMeshCount: 9,
  rAFLoopCount: 4,
}

export const BASE_FRAME_MS = 1.5
export const MS_PER_POSTPROCESS_PASS = 0.7
export const MS_PER_INSTANCE_MESH = 0.5
export const MS_PER_RAF_LOOP = 1.2

export const GPU_THERMAL_LIMIT_MS = 12.0
export const GPU_MEDIUM_LIMIT_MS = 8.0
export const LOW_MEMORY_GB = 4
export const MEDIUM_MEMORY_GB = 8
export const RESOLUTION_DWELL_UP_MS = 5000
export const RESOLUTION_DWELL_DOWN_MS = 3000

const RISK_RANK: Record<ThermalRisk, number> = { low: 0, medium: 1, high: 2 }

export function readDeviceInfo(): DeviceInfo {
  const nav = navigator as any
  const deviceMemoryGB = typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null
  const hardwareConcurrency = typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null
  return { deviceMemoryGB, hardwareConcurrency }
}

export function estimateFrameMs(params: ThermalGuardParams): number {
  const resolutionFactor = params.resolution / THERMAL_DEFAULTS.resolution
  return (
    BASE_FRAME_MS +
    MS_PER_POSTPROCESS_PASS * params.postProcessCount +
    MS_PER_INSTANCE_MESH * params.instanceMeshCount * resolutionFactor +
    MS_PER_RAF_LOOP * params.rAFLoopCount
  )
}

export function classifyRisk(
  frameMs: number,
  deviceMemoryGB: number | null,
): ThermalRisk {
  let frameRisk: ThermalRisk = 'low'
  if (frameMs > GPU_THERMAL_LIMIT_MS) frameRisk = 'high'
  else if (frameMs > GPU_MEDIUM_LIMIT_MS) frameRisk = 'medium'

  let memRisk: ThermalRisk = 'low'
  if (deviceMemoryGB !== null) {
    if (deviceMemoryGB < LOW_MEMORY_GB) memRisk = 'high'
    else if (deviceMemoryGB < MEDIUM_MEMORY_GB) memRisk = 'medium'
  }

  return RISK_RANK[frameRisk] >= RISK_RANK[memRisk] ? frameRisk : memRisk
}

export function classifyRiskHybrid(
  estimatedFrameMs: number,
  measuredFrameMs: number,
  deviceMemoryGB: number | null,
): ThermalRisk {
  const effectiveFrameMs = measuredFrameMs > 0 ? measuredFrameMs : estimatedFrameMs
  return classifyRisk(effectiveFrameMs, deviceMemoryGB)
}

export function useThermalGuard(
  params?: Partial<ThermalGuardParams>,
): ThermalGuardResult {
  const resolution = useStore(state => state.resolution)
  const measuredFrameMs = useStore(state => state.measuredFrameMs)
  const { deviceMemoryGB } = readDeviceInfo()

  const estimatedFrameMs = estimateFrameMs({
    ...THERMAL_DEFAULTS,
    resolution,
    ...params,
  })
  const thermalRisk = classifyRiskHybrid(estimatedFrameMs, measuredFrameMs, deviceMemoryGB)

  return { thermalRisk, estimatedFrameMs, deviceMemoryGB }
}

export interface AdaptiveResolutionResult {
  resolutionTier: 1.0 | 0.75 | 0.5
  effectiveResolution: number
}

export function useAdaptiveResolution(
  resolution: number,
  thermalRisk: ThermalRisk,
): AdaptiveResolutionResult {
  const [resolutionTier, setResolutionTier] = useState<1.0 | 0.75 | 0.5>(1.0)
  const lastTierChangeRef = useRef<number>(Date.now())
  const sustainedRiskRef = useRef<ThermalRisk>('low')
  const sustainedSinceRef = useRef<number>(Date.now())

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastChange = now - lastTierChangeRef.current

    if (thermalRisk !== sustainedRiskRef.current) {
      sustainedRiskRef.current = thermalRisk
      sustainedSinceRef.current = now
    }
    const sustainedDuration = now - sustainedSinceRef.current

    let targetTier: 1.0 | 0.75 | 0.5 = resolutionTier

    if (thermalRisk === 'high' && sustainedDuration >= RESOLUTION_DWELL_DOWN_MS) {
      if (resolutionTier === 1.0) targetTier = 0.75
      else if (resolutionTier === 0.75) targetTier = 0.5
    } else if (thermalRisk === 'medium' && resolutionTier === 1.0 && sustainedDuration >= RESOLUTION_DWELL_DOWN_MS) {
      targetTier = 0.75
    }

    if (thermalRisk === 'low' && sustainedDuration >= RESOLUTION_DWELL_UP_MS) {
      if (resolutionTier === 0.5) targetTier = 0.75
      else if (resolutionTier === 0.75) targetTier = 1.0
    }

    if (targetTier !== resolutionTier && timeSinceLastChange >= RESOLUTION_DWELL_DOWN_MS) {
      setResolutionTier(targetTier)
      lastTierChangeRef.current = now
    }
  }, [thermalRisk, resolutionTier])

  const effectiveResolution = computeEffectiveResolution(resolution, resolutionTier)

  return { resolutionTier, effectiveResolution }
}
