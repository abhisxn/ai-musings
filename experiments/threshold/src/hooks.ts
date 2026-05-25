'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const setVideoElement = useStore(state => state.setVideoElement)
  const initialized = useStore(state => state.initialized)

  useEffect(() => {
    if (!initialized) return
    let currentStream: MediaStream | null = null

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        })
        console.log("Webcam: Stream captured", mediaStream.id)
        currentStream = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.onloadedmetadata = () => {
            console.log("Webcam: Metadata loaded", videoRef.current?.videoWidth, videoRef.current?.videoHeight)
            videoRef.current?.play().catch(e => console.error("Webcam: Play error", e))
          }
          setVideoElement(videoRef.current)
        }
      } catch (err) {
        console.error("Webcam: Error", err)
      }
    }

    setupCamera()

    return () => {
      currentStream?.getTracks().forEach(track => track.stop())
    }
  }, [initialized, setVideoElement])

  return { videoRef }
}

export function useSampler() {
  const initialized = useStore(state => state.initialized)
  const videoElement = useStore(state => state.videoElement)
  const resolution = useStore(state => state.resolution)
  const sourceMode = useStore(state => state.sourceMode)
  
  const dataRef = useRef<Float32Array>(new Float32Array(128 * 128))
  const samplerCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!initialized) return
    if (sourceMode !== 'demo' && !videoElement) return
    
    if (!samplerCanvasRef.current) {
      samplerCanvasRef.current = document.createElement('canvas')
      samplerCanvasRef.current.width = 128
      samplerCanvasRef.current.height = 128
    }
    
    const canvas = samplerCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    
    let isProcessing = false
    let frameId: number
    let isMounted = true

    const process = () => {
      if (!isMounted) return

      if (isProcessing) {
        frameId = requestAnimationFrame(process)
        return
      }

      if (sourceMode === 'demo') {
        isProcessing = true
        const time = Date.now() / 1000
        for (let y = 0; y < resolution; y++) {
          const targetY = y * resolution
          for (let x = 0; x < resolution; x++) {
            const nx = x / resolution
            const ny = y / resolution
            const val = 0.5 + 0.5 * Math.sin(nx * 6 + time * 0.8) * Math.cos(ny * 4 + time * 0.5)
            dataRef.current[targetY + x] = val
          }
        }
        isProcessing = false
        frameId = requestAnimationFrame(process)
        return
      }

      if (videoElement && videoElement.readyState >= 2) {
        isProcessing = true
        try {
          ctx.drawImage(videoElement, 0, 0, 128, 128)
          const imageData = ctx.getImageData(0, 0, 128, 128)
          const data = imageData.data

          for (let y = 0; y < resolution; y++) {
            const targetY = y * resolution
            const sy = Math.floor((y / resolution) * 128)
            for (let x = 0; x < resolution; x++) {
              const sx = Math.floor((x / resolution) * 128)
              const idx = (sy * 128 + sx) * 4
              const r = data[idx]
              const g = data[idx + 1]
              const b = data[idx + 2]
              const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
              dataRef.current[targetY + x] = brightness
            }
          }
        } catch (e) {
          // frame skip
        } finally {
          isProcessing = false
        }
      }
      
      if (isMounted) {
        frameId = requestAnimationFrame(process)
      }
    }

    process()
    return () => {
      isMounted = false
      cancelAnimationFrame(frameId)
    }
  }, [videoElement, resolution, sourceMode, initialized])

  return { dataRef }
}

export function useMotionZones() {
  const initialized = useStore(state => state.initialized)
  const videoElement = useStore(state => state.videoElement)
  const setZoneEnergy = useStore(state => state.setZoneEnergy)
  const [statusText, setStatusText] = useState<string>('waiting for camera...')

  useEffect(() => {
    if (!videoElement || !initialized) return

    let isActive = true
    let frameId: number
    const ZONE_THRESHOLD = 0.15
    const IDLE_THRESHOLD = ZONE_THRESHOLD * 0.5
    let prevZoneData: Uint8Array | null = null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const detect = () => {
      if (!isActive) return

      if (videoElement.readyState < 2) {
        frameId = requestAnimationFrame(detect)
        return
      }

      try {
        ctx.drawImage(videoElement, 0, 0, 64, 48)
        const imageData = ctx.getImageData(0, 0, 64, 48)
        const pixels = imageData.data

        if (!prevZoneData) {
          prevZoneData = new Uint8Array(64 * 48)
          for (let i = 0; i < 64 * 48; i++) {
            const idx = i * 4
            prevZoneData[i] = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3
          }
          frameId = requestAnimationFrame(detect)
          return
        }

        const zoneWidth = 64 / 3
        const zoneDeltas = [0, 0, 0]
        const zoneCounts = [0, 0, 0]

        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 64; x++) {
            const idx = y * 64 + x
            const pixelIdx = idx * 4
            const brightness = (pixels[pixelIdx] + pixels[pixelIdx + 1] + pixels[pixelIdx + 2]) / 3
            const delta = Math.abs(brightness - prevZoneData[idx])
            const zone = Math.min(2, Math.floor(x / zoneWidth))
            zoneDeltas[zone] += delta
            zoneCounts[zone]++
            prevZoneData[idx] = brightness
          }
        }

        const avgDeltas = zoneDeltas.map((sum, i) => sum / zoneCounts[i])
        const maxDelta = Math.max(...avgDeltas)
        const maxZone = avgDeltas.indexOf(maxDelta)

        setZoneEnergy(avgDeltas.map(d => Math.min(1, d * 3)) as [number, number, number])

        if (maxDelta < IDLE_THRESHOLD) {
          setStatusText('idle')
        } else {
          const zoneNames = ['LEFT', 'CENTER', 'RIGHT']
          setStatusText(`${zoneNames[maxZone]} ${Math.round(maxDelta * 100)}%`)
        }
      } catch (e) {
        // frame skip
      }

      frameId = requestAnimationFrame(detect)
    }

    detect()
    return () => { isActive = false; cancelAnimationFrame(frameId) }
  }, [videoElement, initialized])

  return { statusText }
}