import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { Phase } from './types'

const CHARGE_RATE = 2
const DRAIN_RATE = 0.5

export function useEnergyAccumulator() {
  const moodEnabled = useStore(state => state.moodEnabled)
  const setSessionEnergy = useStore(state => state.setSessionEnergy)
  const setCurrentPhase = useStore(state => state.setCurrentPhase)
  const videoElement = useStore(state => state.videoElement)
  const initialized = useStore(state => state.initialized)

  useEffect(() => {
    if (!videoElement || !initialized || !moodEnabled) {
      setSessionEnergy(0)
      setCurrentPhase('calm')
      return
    }

    let isActive = true
    let frameId: number
    let prevFrame: Uint8Array | null = null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    let energy = 0

    const loop = () => {
      if (!isActive) return
      if (videoElement.readyState < 2) {
        frameId = requestAnimationFrame(loop)
        return
      }

      try {
        ctx.drawImage(videoElement, 0, 0, 64, 48)
        const imageData = ctx.getImageData(0, 0, 64, 48)
        const pixels = imageData.data

        if (!prevFrame) {
          prevFrame = new Uint8Array(64 * 48)
          for (let i = 0; i < 64 * 48; i++) {
            prevFrame[i] = (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3
          }
          frameId = requestAnimationFrame(loop)
          return
        }

        let totalDelta = 0
        for (let i = 0; i < 64 * 48; i++) {
          const brightness = (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3
          totalDelta += Math.abs(brightness - prevFrame[i])
          prevFrame[i] = brightness
        }
        const motionMagnitude = Math.min(1, totalDelta / (64 * 48 * 255) * 10)

        energy += motionMagnitude * CHARGE_RATE * (1 / 60)
        energy -= (1 - motionMagnitude) * DRAIN_RATE * (1 / 60)
        energy = Math.max(0, Math.min(100, energy))

        let phase: Phase
        if (energy < 35) phase = 'calm'
        else if (energy < 70) phase = 'active'
        else phase = 'climax'

        if (phase === 'active' && energy < 25) phase = 'calm'
        if (phase === 'climax' && energy < 65) phase = 'active'

        setSessionEnergy(energy)
        setCurrentPhase(phase)
      } catch (e) {
        // frame skip
      }

      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => {
      isActive = false
      cancelAnimationFrame(frameId)
      setSessionEnergy(0)
      setCurrentPhase('calm')
    }
  }, [videoElement, initialized, moodEnabled, setSessionEnergy, setCurrentPhase])
}
