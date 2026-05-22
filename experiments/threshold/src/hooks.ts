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
  const aiModelRef = useRef<any>(null)
  const transformersRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)

  // 1. AI Setup (Dynamic Import)
  useEffect(() => {
    if (!initialized || sourceMode !== 'ai' || aiModelRef.current) return
    
    async function loadAI() {
      setLoading(true)
      try {
        const { pipeline, env, RawImage } = await import('@xenova/transformers')
        env.allowLocalModels = false
        transformersRef.current = { RawImage }
        aiModelRef.current = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf')
      } catch (err) { 
        console.error("AI Load Error:", err) 
      } finally { 
        setLoading(false) 
      }
    }
    loadAI()
  }, [initialized, sourceMode])

  // 2. Main Sampling Loop
  useEffect(() => {
    if (!videoElement || !initialized) return
    
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
    let frameCount = 0

    const process = async () => {
      if (!isMounted) return

      if (videoElement.readyState >= 2 && !isProcessing) {
        isProcessing = true
        frameCount++
        try {
          if (frameCount === 1) {
            console.log("Sampler: Video ready", videoElement.videoWidth, "x", videoElement.videoHeight)
          }

          ctx.drawImage(videoElement, 0, 0, 128, 128)
          const imageData = ctx.getImageData(0, 0, 128, 128)
          
          if (frameCount % 60 === 0) {
            const centerIdx = (64 * 128 + 64) * 4
            console.log("Sampler: Frame", frameCount, "Center Pixel:", imageData.data[centerIdx], imageData.data[centerIdx+1], imageData.data[centerIdx+2])
          }

          if (sourceMode === 'ai' && aiModelRef.current && transformersRef.current) {
            const { RawImage } = transformersRef.current
            const image = new RawImage(imageData.data, 128, 128, 4)
            const result = await aiModelRef.current(image)
            
            if (!isMounted) return

            const depthData = result.depth.data

            let max = 0
            for (let i = 0; i < depthData.length; i++) if (depthData[i] > max) max = depthData[i]

            for (let y = 0; y < resolution; y++) {
              const targetY = y * resolution
              const sy = Math.floor((y / resolution) * 128)
              for (let x = 0; x < resolution; x++) {
                const sx = Math.floor((x / resolution) * 128)
                const val = depthData[sy * 128 + sx]
                dataRef.current[targetY + x] = max > 1 ? val / max : val
              }
            }
          } else {
            // PIXEL MODE: Instant Brightness
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
          }
        } catch (e) { 
          console.error("Loop Error:", e) 
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

  return { loading, dataRef }
}

export function useMotionZones() {
  const initialized = useStore(state => state.initialized)
  const setCurrentGesture = useStore(state => state.setCurrentGesture)
  const setCurrentMode = useStore(state => state.setCurrentMode)
  const videoElement = useStore(state => state.videoElement)
  const currentGesture = useStore(state => state.currentGesture)
  const [statusText, setStatusText] = useState<string>('waiting for camera...')

  // Gesture → Mode mapping
  const gestureToMode: Record<string, 'glitch' | 'bloom' | 'bass'> = {
    'jazz-hands': 'glitch',
    'peace-sign': 'bloom',
    'fist-pump': 'bass',
  }

  useEffect(() => {
    if (!videoElement || !initialized) return

    let isActive = true
    let frameId: number
    let lockedUntil = 0
    const LOCK_DURATION = 3000
    const ZONE_THRESHOLD = 0.15
    const CONSECUTIVE_FRAMES = 5
    const IDLE_THRESHOLD = ZONE_THRESHOLD * 0.5
    const motionBuffer: number[] = []
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
        const now = Date.now()

        if (now < lockedUntil) {
          setStatusText(`LOCKED ${Math.ceil((lockedUntil - now) / 1000)}s`)
        } else {
          const maxDelta = Math.max(...avgDeltas)
          const maxZone = avgDeltas.indexOf(maxDelta)

motionBuffer.push(maxZone)
if (motionBuffer.length > CONSECUTIVE_FRAMES) {
  motionBuffer.shift()
}

          if (motionBuffer.length >= CONSECUTIVE_FRAMES) {
            const allSame = motionBuffer.every(v => v === motionBuffer[0])
            if (allSame && avgDeltas[maxZone] > ZONE_THRESHOLD) {
              const zoneGestures: Array<'jazz-hands' | 'peace-sign' | 'fist-pump'> = ['jazz-hands', 'peace-sign', 'fist-pump']
              const gesture = zoneGestures[motionBuffer[0]]
              if (gesture) {
                setCurrentGesture(gesture)
                setCurrentMode(gestureToMode[gesture] || null)
                lockedUntil = now + LOCK_DURATION
                setStatusText(`TRIGGER: ${gestureToMode[gesture]?.toUpperCase() || gesture}`)
              }
            }
          }

          if (maxDelta < IDLE_THRESHOLD) {
            setStatusText('idle')
          } else {
            const zoneNames = ['LEFT', 'CENTER', 'RIGHT']
            setStatusText(`${zoneNames[maxZone]} ${Math.round(maxDelta * 100)}%`)
          }
        }
      } catch (e) {
        // frame skip
      }

      frameId = requestAnimationFrame(detect)
    }

    detect()
    return () => { isActive = false; cancelAnimationFrame(frameId) }
  }, [videoElement, initialized, setCurrentGesture, setCurrentMode])

  // Auto-demo mode: cycle gestures if no motion detected for 15s
  useEffect(() => {
    if (!initialized) return
    let timer: ReturnType<typeof setTimeout>
    const gestures: Array<'jazz-hands' | 'peace-sign' | 'fist-pump'> = ['jazz-hands', 'peace-sign', 'fist-pump']
    let i = 0

    const cycle = () => {
      if (!currentGesture) {
        setCurrentGesture(gestures[i % gestures.length])
        setCurrentMode(gestureToMode[gestures[i % gestures.length]] || null)
        i++
      }
      timer = setTimeout(cycle, 8000)
    }

    timer = setTimeout(cycle, 15000)
    return () => clearTimeout(timer)
  }, [initialized, currentGesture, setCurrentGesture, setCurrentMode])

  return { statusText }
}