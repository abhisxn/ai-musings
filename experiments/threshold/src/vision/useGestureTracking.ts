'use client'

/**
 * Main-thread hook that owns the `gesture-worker` lifecycle: creates the
 * worker + its OffscreenCanvas, feeds it webcam frames at the browser's own
 * paint rate (throttled to the worker's actual consumption rate - never more
 * than one frame in flight), and writes resolved results into the store.
 *
 * Policy for low confidence / no hand / worker failure lives in `pinch.ts`'s
 * `resolveGesture`/`resolveContinuousValue` (imported, not reimplemented) and
 * in the `GestureTrackingStatus` written to the store: an `init`-phase worker
 * error is permanent for the session (`status: 'failed'`), signalling
 * `useUnifiedSampler` to take over as the fallback motion detector.
 */

import { useEffect } from 'react'
import { useStore } from '../store'
import {
  calculateLandmarkDistance,
  derivePinchGesture,
  detectGestureEdge,
  normalizePinchDistance,
  resolveContinuousValue,
  resolveGesture,
  type Gesture,
} from './pinch'
import type {
  GestureWorkerOutgoingMessage,
  HandGestureResult,
  InitMessage,
} from './gesture-worker'

/** Maps MediaPipe's built-in gesture category names to our vocabulary. Pinch isn't in this map - it's derived from fingertip distance, not the built-in classifier. */
const RAW_GESTURE_MAP: Record<string, Exclude<Gesture, null>> = {
  Closed_Fist: 'fist',
  Open_Palm: 'open_palm',
  Thumb_Up: 'thumb_up',
  Thumb_Down: 'thumb_down',
}

function mapRawGesture(raw: string | null): Gesture {
  if (!raw) return null
  return RAW_GESTURE_MAP[raw] ?? null
}

// MediaPipe Hands landmark indices (see gesture-worker.ts doc comment).
const WRIST_INDEX = 0
const THUMB_TIP_INDEX = 4
const INDEX_TIP_INDEX = 8

export function useGestureTracking() {
  const initialized = useStore((state) => state.initialized)
  const videoElement = useStore((state) => state.videoElement)
  const setHandTracking = useStore((state) => state.setHandTracking)
  const setGestureTrackingStatus = useStore((state) => state.setGestureTrackingStatus)
  const status = useStore((state) => state.gestureTrackingStatus)

  useEffect(() => {
    if (!initialized || !videoElement) return

    // `requestVideoFrameCallback`/OffscreenCanvas transfer aren't available in
    // every environment (older Safari, some test/SSR contexts) - treat that
    // as a permanent failure for this session, same as an init error, so the
    // caller falls back to `useUnifiedSampler`.
    if (typeof HTMLCanvasElement === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      setGestureTrackingStatus('failed')
      return
    }

    let cancelled = false
    let worker: Worker | null = null
    let rvfcHandle: number | null = null
    let rafHandle: number | null = null
    let awaitingResult = false
    let workerReady = false

    // Carried across frames for hold-last-value / edge-detection policy.
    let previousGesture: Gesture = null
    let previousPinchDistance = 0
    let previousWrist: { x: number; y: number; z: number } | null = null
    let frameCounter = 0

    setGestureTrackingStatus('loading')

    const canvas = document.createElement('canvas')
    let offscreen: OffscreenCanvas
    try {
      offscreen = canvas.transferControlToOffscreen()
    } catch (err) {
      setGestureTrackingStatus('failed')
      return
    }

    worker = new Worker(new URL('./gesture-worker.ts', import.meta.url), { type: 'module' })

    function scheduleNextFrame() {
      if (cancelled || !videoElement) return
      const el = videoElement as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number
      }
      if (typeof el.requestVideoFrameCallback === 'function') {
        rvfcHandle = el.requestVideoFrameCallback(() => {
          void captureAndSendFrame()
        })
      } else {
        rafHandle = requestAnimationFrame(() => {
          void captureAndSendFrame()
        })
      }
    }

    async function captureAndSendFrame() {
      if (cancelled || !worker || !workerReady || awaitingResult) return
      frameCounter += 1
      if (frameCounter % 3 !== 0) {
        scheduleNextFrame()
        return
      }
      if (!videoElement || videoElement.readyState < 2) {
        scheduleNextFrame()
        return
      }
      try {
        const bitmap = await createImageBitmap(videoElement)
        if (cancelled || !worker) {
          bitmap.close()
          return
        }
        awaitingResult = true
        worker.postMessage({ type: 'frame', bitmap, timestamp: performance.now() }, [bitmap])
      } catch {
        // Frame-grab glitch (e.g. video not ready this tick) - just retry next frame.
        scheduleNextFrame()
      }
    }

    function applyResult(hand: HandGestureResult | undefined) {
      const detected = !!hand
      const confidence = hand?.confidence ?? 0

      const rawGesture = mapRawGesture(hand?.gesture ?? null)
      let resolvedGesture = resolveGesture(rawGesture, detected, confidence)

      let pinchDistance = previousPinchDistance
      if (hand) {
        const rawDistance = calculateLandmarkDistance(
          hand.landmarks[THUMB_TIP_INDEX],
          hand.landmarks[INDEX_TIP_INDEX]
        )
        const normalized = normalizePinchDistance(rawDistance)
        pinchDistance = resolveContinuousValue(normalized, previousPinchDistance, detected, confidence)

        // Pinch isn't reported by the built-in classifier - derive it from
        // fingertip distance and let it take priority as the discrete
        // gesture when the classifier itself reported nothing (`null`).
        if (!resolvedGesture) {
          const pinchGesture = derivePinchGesture(normalized)
          resolvedGesture = resolveGesture(pinchGesture, detected, confidence)
        }
      } else {
        pinchDistance = resolveContinuousValue(previousPinchDistance, previousPinchDistance, detected, confidence)
      }

      const edge = detectGestureEdge(previousGesture, resolvedGesture)
      previousGesture = resolvedGesture
      previousPinchDistance = pinchDistance

      let wrist = previousWrist
      if (detected && confidence >= 0.6 && hand) {
        wrist = hand.landmarks[WRIST_INDEX]
      }
      previousWrist = wrist

      setHandTracking({
        detected,
        wrist,
        pinchDistance,
        // One-shot: only report a gesture on the frame it's entered, not
        // every frame it's held - avoids re-firing downstream "moment" logic.
        gesture: edge.entered ?? null,
        confidence,
      })
    }

    worker.onmessage = (event: MessageEvent<GestureWorkerOutgoingMessage>) => {
      if (cancelled) return
      const msg = event.data

      switch (msg.type) {
        case 'ready':
          workerReady = true
          setGestureTrackingStatus('active')
          scheduleNextFrame()
          break
        case 'result':
          awaitingResult = false
          applyResult(msg.hands[0])
          scheduleNextFrame()
          break
        case 'error':
          if (msg.phase === 'init') {
            // Permanent for this session - the model/WASM never loaded.
            setGestureTrackingStatus('failed')
          } else {
            // One-off glitch on an already-running recognizer - keep going.
            awaitingResult = false
            scheduleNextFrame()
          }
          break
      }
    }

    worker.postMessage({ type: 'init', canvas: offscreen } as InitMessage, [offscreen])

    return () => {
      cancelled = true
      const el = videoElement as HTMLVideoElement & {
        cancelVideoFrameCallback?: (handle: number) => void
      }
      if (rvfcHandle !== null && typeof el.cancelVideoFrameCallback === 'function') {
        el.cancelVideoFrameCallback(rvfcHandle)
      }
      if (rafHandle !== null) cancelAnimationFrame(rafHandle)
      // Don't call worker.terminate() here - it aborts the worker
      // synchronously and discards the in-flight 'close' message, so
      // handleClose() (which releases the MediaPipe/WASM/GPU context) would
      // never run. Let the worker close itself via self.close() inside
      // handleClose() after it finishes cleanup.
      worker?.postMessage({ type: 'close' })
      setGestureTrackingStatus('idle')
    }
  }, [initialized, videoElement, setHandTracking, setGestureTrackingStatus])

  return { status }
}
