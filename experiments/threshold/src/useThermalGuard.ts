'use client'

import { useStore } from './store'

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

export function useThermalGuard(
  params?: Partial<ThermalGuardParams>,
): ThermalGuardResult {
  const resolution = useStore(state => state.resolution)
  const { deviceMemoryGB } = readDeviceInfo()

  const estimatedFrameMs = estimateFrameMs({
    ...THERMAL_DEFAULTS,
    resolution,
    ...params,
  })
  const thermalRisk = classifyRisk(estimatedFrameMs, deviceMemoryGB)

  return { thermalRisk, estimatedFrameMs, deviceMemoryGB }
}
