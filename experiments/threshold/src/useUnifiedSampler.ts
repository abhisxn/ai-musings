'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { Phase } from './types'
import { wristDeltaMagnitude, type WristPosition } from './vision/wrist-mapping'
import * as THREE from 'three'

export function useUnifiedSampler() {
  const initialized = useStore(state => state.initialized)
  const videoElement = useStore(state => state.videoElement)
  const resolution = useStore(state => state.resolution)
  const sourceMode = useStore(state => state.sourceMode)

  const dataRef = useRef<Float32Array>(new Float32Array(128 * 128))
  const samplerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const [statusText, setStatusText] = useState<string>('waiting for camera...')
  const prevFrameRef = useRef<Uint8Array | null>(null)
  const prevResRef = useRef<number>(0)
  const prevWristRef = useRef<WristPosition | null>(null)
  const energyRef = useRef<number>(0)

  useEffect(() => {
    if (!initialized) return
    if (sourceMode !== 'demo' && !videoElement) return

    if (!samplerCanvasRef.current) {
      samplerCanvasRef.current = document.createElement('canvas')
    }
    samplerCanvasRef.current.width = resolution
    samplerCanvasRef.current.height = resolution

    const canvas = samplerCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    prevFrameRef.current = null
    prevResRef.current = resolution
    prevWristRef.current = null

    const ZONE_THRESHOLD = 0.15
    const IDLE_THRESHOLD = ZONE_THRESHOLD * 0.5
    const CHARGE_RATE = 2
    const DRAIN_RATE = 0.5
    const PIXEL_SCALE = 10

    let frameId: number
    let isMounted = true

    const loop = () => {
      if (!isMounted) return

      const { gestureTrackingStatus, handTracking, moodEnabled } = useStore.getState()
      const gestureActive = gestureTrackingStatus === 'active'

      let motionMagnitude = 0

      if (sourceMode === 'demo') {
        const time = Date.now() / 1000
        for (let y = 0; y < resolution; y++) {
          const targetY = y * resolution
          for (let x = 0; x < resolution; x++) {
            const nx = x / resolution
            const ny = y / resolution
            dataRef.current[targetY + x] = 0.5 + 0.5 * Math.sin(nx * 6 + time * 0.8) * Math.cos(ny * 4 + time * 0.5)
          }
        }
      } else if (videoElement && videoElement.readyState >= 2) {
        try {
          ctx.drawImage(videoElement, 0, 0, resolution, resolution)
          const imageData = ctx.getImageData(0, 0, resolution, resolution)
          const pixels = imageData.data

          for (let y = 0; y < resolution; y++) {
            const targetY = y * resolution
            for (let x = 0; x < resolution; x++) {
              const idx = (y * resolution + x) * 4
              dataRef.current[targetY + x] = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]) / 255
            }
          }

          if (!gestureActive) {
            const zoneWidth = resolution / 3
            const zoneDeltas = [0, 0, 0]
            const zoneCounts = [0, 0, 0]
            let totalDelta = 0

            if (!prevFrameRef.current || prevResRef.current !== resolution) {
              prevFrameRef.current = new Uint8Array(resolution * resolution)
              prevResRef.current = resolution
              for (let i = 0; i < resolution * resolution; i++) {
                prevFrameRef.current[i] = (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3
              }
              frameId = requestAnimationFrame(loop)
              return
            }

            for (let y = 0; y < resolution; y++) {
              for (let x = 0; x < resolution; x++) {
                const pIdx = (y * resolution + x) * 4
                const brightness = (pixels[pIdx] + pixels[pIdx + 1] + pixels[pIdx + 2]) / 3
                const linearIdx = y * resolution + x
                const delta = Math.abs(brightness - prevFrameRef.current[linearIdx])
                const zone = Math.min(2, Math.floor(x / zoneWidth))
                zoneDeltas[zone] += delta
                zoneCounts[zone]++
                totalDelta += delta
                prevFrameRef.current[linearIdx] = brightness
              }
            }

            const avgDeltas = zoneDeltas.map((sum, i) => sum / zoneCounts[i])
            const maxDelta = Math.max(...avgDeltas)

            const zoneEnergy = avgDeltas.map(d => Math.min(1, d * 3)) as [number, number, number]
            useStore.getState().setZoneEnergy(zoneEnergy)

            if (maxDelta < IDLE_THRESHOLD) {
              setStatusText('idle')
            } else {
              const maxZone = avgDeltas.indexOf(maxDelta)
              const zoneNames = ['LEFT', 'CENTER', 'RIGHT']
              setStatusText(`${zoneNames[maxZone]} ${Math.round(maxDelta * 100)}%`)
            }

            const pixelCount = resolution * resolution
            motionMagnitude = Math.min(1, totalDelta / (pixelCount * 255) * PIXEL_SCALE)
          } else {
            setStatusText('gesture tracking active')
          }
        } catch (e) {
          // frame skip
        }
      }

      if (gestureActive) {
        if (handTracking.detected && handTracking.wrist) {
          motionMagnitude = wristDeltaMagnitude(handTracking.wrist, prevWristRef.current)
          prevWristRef.current = handTracking.wrist
        }
        prevFrameRef.current = null
      } else {
        prevWristRef.current = null
      }

      if (moodEnabled) {
        energyRef.current += motionMagnitude * CHARGE_RATE * (1 / 60)
        energyRef.current -= (1 - motionMagnitude) * DRAIN_RATE * (1 / 60)
        energyRef.current = Math.max(0, Math.min(100, energyRef.current))

        let phase: Phase
        if (energyRef.current < 35) phase = 'calm'
        else if (energyRef.current < 70) phase = 'active'
        else phase = 'climax'

        if (phase === 'active' && energyRef.current < 25) phase = 'calm'
        if (phase === 'climax' && energyRef.current < 65) phase = 'active'

        useStore.getState().setSessionEnergy(energyRef.current)
        useStore.getState().setCurrentPhase(phase)
      } else {
        energyRef.current = 0
        useStore.getState().setSessionEnergy(0)
        useStore.getState().setCurrentPhase('calm')
      }

      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => {
      isMounted = false
      cancelAnimationFrame(frameId)
    }
  }, [videoElement, resolution, sourceMode, initialized])

  useEffect(() => {
    if (!samplerCanvasRef.current) return
    if (!frameTextureRef.current) {
      const t = new THREE.CanvasTexture(samplerCanvasRef.current)
      t.minFilter = THREE.LinearFilter
      t.magFilter = THREE.LinearFilter
      t.colorSpace = THREE.SRGBColorSpace
      frameTextureRef.current = t
    } else {
      frameTextureRef.current.needsUpdate = true
    }
  })

  return { dataRef, frameTextureRef, statusText }
}
