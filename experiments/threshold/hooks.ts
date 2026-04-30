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
