'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useStore } from './store'
import { createStreamAttacher } from './videoStreamAttacher'

export function useWebcam() {
  const streamRef = useRef<MediaStream | null>(null)
  const setVideoElement = useStore(state => state.setVideoElement)
  const initialized = useStore(state => state.initialized)
  const resolution = useStore(state => state.resolution)

  // ThresholdView mounts/unmounts its <video> element across several
  // conditional branches (init screen / onboarding / main scene). A plain
  // `useRef` + "attach once when the stream resolves" only ever wires the
  // stream to whichever node happened to exist at that moment — any later
  // remount (e.g. dismissing onboarding) left the new node disconnected
  // from the live stream. This attacher re-attaches on every node change.
  // Using lazy initialization to avoid calling createStreamAttacher on every render.
  const attacherRef = useRef<ReturnType<typeof createStreamAttacher<MediaStream, HTMLVideoElement>> | null>(null)
  if (!attacherRef.current) {
    attacherRef.current = createStreamAttacher<MediaStream, HTMLVideoElement>((node, mediaStream) => {
      node.srcObject = mediaStream
      if (mediaStream) {
        node.onloadedmetadata = () => {
          console.log('Webcam: Metadata loaded', node.videoWidth, node.videoHeight)
          node.play().catch(e => console.error('Webcam: Play error', e))
        }
      }
      setVideoElement(node)
    })
  }

  useEffect(() => {
    if (!initialized) return
    let cancelled = false

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: resolution, height: resolution },
          audio: false
        })
        if (cancelled) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }
        console.log("Webcam: Stream captured", mediaStream.id)
        streamRef.current = mediaStream
        attacherRef.current.setStream(mediaStream)
      } catch (err) {
        console.error("Webcam: Error", err)
      }
    }

    setupCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      attacherRef.current.setStream(null)
    }
  }, [initialized, resolution])

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    attacherRef.current.setNode(node)
  }, [])

  return { videoRef }
}
