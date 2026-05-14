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

            const depthData = result.depth.data // This is a Float32Array
            
            // Find min/max for normalization if needed, but depth-anything usually is 0-1 or 0-255
            // Let's ensure it's mapped 0-1
            let max = 0
            for (let i = 0; i < depthData.length; i++) if (depthData[i] > max) max = depthData[i]

            for (let y = 0; y < resolution; y++) {
              const targetY = y * resolution
              const sy = Math.floor((y / resolution) * 128)
              for (let x = 0; x < resolution; x++) {
                const sx = Math.floor((x / resolution) * 128)
                const val = depthData[sy * 128 + sx]
                // Normalize to 0-1 based on observed max if it looks flat
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
                // Luma calculation
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

function detectGestureFromKeypoints(keypoints: Array<{x: number, y: number, z: number, confidence: number}>): GestureType | null {
  if (!keypoints || keypoints.length < 21) return null

  const wrist = keypoints[0]
  const thumbTip = keypoints[4]
  const indexTip = keypoints[8]
  const middleTip = keypoints[12]
  const ringTip = keypoints[16]
  const pinkyTip = keypoints[20]
  const indexPip = keypoints[6]
  const middlePip = keypoints[10]
  const ringPip = keypoints[14]
  const pinkyPip = keypoints[18]

  const dist = (a: typeof wrist, b: typeof wrist) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)

  const fingerSpread = dist(indexTip, pinkyTip)
  const handSize = dist(wrist, middleTip)

  const indexExtended = dist(indexTip, indexPip) > handSize * 0.3
  const middleExtended = dist(middleTip, middlePip) > handSize * 0.3
  const ringExtended = dist(ringTip, ringPip) > handSize * 0.25
  const pinkyExtended = dist(pinkyTip, pinkyPip) > handSize * 0.25

  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length
  const spreadNorm = fingerSpread / handSize

  if (extendedCount >= 4 && spreadNorm > 0.8) return 'jazz-hands'
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return 'peace-sign'
  if (extendedCount <= 1) return 'fist-pump'

  return null
}

export function usePoseDetection() {
  const initialized = useStore(state => state.initialized)
  const setCurrentGesture = useStore(state => state.setCurrentGesture)
  const workerRef = useRef<Worker | null>(null)
  const [poseReady, setPoseReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentGestureRef = useRef<GestureType | null>(null)

  // 1. Initialize pose worker
  useEffect(() => {
    if (!initialized) return

    const worker = new Worker(
      new URL('./workers/pose-worker.js', import.meta.url),
      { type: 'classic' }
    )
    workerRef.current = worker

    worker.onmessage = (event) => {
      const { type, keypoints } = event.data
      if (type === 'INIT_DONE') {
        console.log('Pose: Worker initialized')
        setPoseReady(true)
      }
      if (type === 'POSE_RESULTS' && keypoints) {
        const gesture = detectGestureFromKeypoints(keypoints)
        if (gesture && gesture !== currentGestureRef.current) {
          currentGestureRef.current = gesture
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            setCurrentGesture(gesture)
            console.log('Pose: Gesture detected:', gesture)
            currentGestureRef.current = null
          }, 500)
        }
      }
    }

    worker.postMessage({ type: 'INIT' })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      worker.terminate()
      workerRef.current = null
    }
  }, [initialized, setCurrentGesture])

  // 2. Capture frames and send to pose worker
  const videoElement = useStore(state => state.videoElement)

  useEffect(() => {
    if (!videoElement || !poseReady) return

    let isActive = true
    let frameId: number
    let frameCount = 0
    const INTERVAL = 2 // Process every 2nd frame (~15fps for pose, lightweight)

    const capture = async () => {
      if (!isActive) return
      frameCount++

      if (videoElement.readyState >= 2 && workerRef.current && frameCount % INTERVAL === 0) {
        try {
          const bitmap = await createImageBitmap(videoElement, {
            resizeWidth: 320,
            resizeHeight: 240,
            resizeQuality: 'low'
          })
          workerRef.current.postMessage({ type: 'DETECT', imageBitmap: bitmap }, [bitmap])
        } catch (e) {
          // Silently handle — bitmap may fail if video isn't ready
        }
      }

      if (isActive) frameId = requestAnimationFrame(capture)
    }

    capture()

    return () => {
      isActive = false
      cancelAnimationFrame(frameId)
    }
  }, [videoElement, poseReady])
}
