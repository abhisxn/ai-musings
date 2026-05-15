'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { GestureType } from './types'

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

export function usePoseDetection() {
  const initialized = useStore(state => state.initialized)
  const setCurrentGesture = useStore(state => state.setCurrentGesture)
  const setCurrentShader = useStore(state => state.setCurrentShader)
  const setAudioProfile = useStore(state => state.setAudioProfile)
  const currentGesture = useStore(state => state.currentGesture)
  const spawnHallucinatedControls = useStore(state => state.spawnHallucinatedControls)
  const workerRef = useRef<Worker | null>(null)
  const [poseReady, setPoseReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastGestureRef = useRef<GestureType | null>(null)
  const lastGestureTimeRef = useRef(0)
  const demoModeRef = useRef(false)

  // Gesture label for UI
  const [statusText, setStatusText] = useState<string>('waiting for camera...')

  // 1. Initialize pose worker (no CDN dependency — pure pixel analysis)
  useEffect(() => {
    if (!initialized) return

    const worker = new Worker(
      new URL('./workers/pose-worker.js', import.meta.url),
      { type: 'classic' }
    )
    workerRef.current = worker

    let initTimer: ReturnType<typeof setTimeout> | null = null

    worker.onmessage = (event) => {
      const { type, gesture, confidence } = event.data

      if (type === 'INIT_DONE') {
        console.log('Pose: Worker ready')
        setPoseReady(true)
        setStatusText('camera active')

        // Fallback: if no gesture detected for 10s, switch to demo mode
        initTimer = setTimeout(() => {
          if (!lastGestureRef.current && !demoModeRef.current) {
            console.log('Pose: No gestures detected, entering demo mode')
            demoModeRef.current = true
            setStatusText('demo mode')
            startDemoCycle()
          }
        }, 10000)
      }

      if (type === 'POSE_RESULTS' && gesture) {
        lastGestureRef.current = gesture as GestureType

        if (debounceRef.current) clearTimeout(debounceRef.current)

        // Debounce: wait 800ms before accepting a new gesture
        const now = Date.now()
        if (now - lastGestureTimeRef.current > 800) {
          lastGestureTimeRef.current = now
          setCurrentGesture(gesture as GestureType)
          console.log('Pose: Gesture detected:', gesture, 'confidence:', confidence?.toFixed(2))
          setStatusText(`gesture: ${gesture}`)
        }
      }
    }

    worker.postMessage({ type: 'INIT' })

    return () => {
      if (initTimer) clearTimeout(initTimer)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      worker.terminate()
      workerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  // Demo mode: cycle through gestures
  const startDemoCycle = () => {
    const gestures: GestureType[] = ['jazz-hands', 'peace-sign', 'fist-pump']
    const experienceLabels = ['glitch', 'bloom', 'bass']
    let i = 0
    const cycle = setInterval(() => {
      const g = gestures[i % gestures.length]
      setCurrentGesture(g)
      setStatusText(`demo: ${g} — ${experienceLabels[i % experienceLabels.length]}`)
      i++
      // After 3 cycles, check if real detection has started
      if (i >= 6 && lastGestureRef.current) {
        clearInterval(cycle)
        setStatusText(`gesture: ${lastGestureRef.current}`)
      }
    }, 3000)
    return cycle
  }

  // 2. Capture frames and send to pose worker
  const videoElement = useStore(state => state.videoElement)

  useEffect(() => {
    if (!videoElement || !poseReady) return

    let isActive = true
    let frameId: number
    let frameCount = 0

    const capture = async () => {
      if (!isActive) return
      frameCount++

      if (videoElement.readyState >= 2 && workerRef.current && frameCount % 3 === 0) {
        try {
          const bitmap = await createImageBitmap(videoElement, {
            resizeWidth: 160,
            resizeHeight: 120,
            resizeQuality: 'low'
          })
          workerRef.current.postMessage({ type: 'DETECT', imageBitmap: bitmap }, [bitmap])
        } catch (e) {
          // frame not ready
        }
      }
      if (isActive) frameId = requestAnimationFrame(capture)
    }

    capture()
    return () => { isActive = false; cancelAnimationFrame(frameId) }
  }, [videoElement, poseReady])

  return { poseReady, statusText }
}