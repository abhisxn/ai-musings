/**
 * Gesture recognition Web Worker.
 *
 * Loads MediaPipe Tasks Vision `GestureRecognizer` and runs hand-landmark +
 * built-in gesture inference off the main thread, so a slow inference tick
 * can never drop a Three.js render frame.
 *
 * Frame flow:
 *   1. Main thread sends `init` once with an `OffscreenCanvas` (transferred
 *      ownership) plus optional asset overrides.
 *   2. For each captured frame, main thread transfers an `ImageBitmap` via a
 *      `frame` message. The worker draws it onto its own OffscreenCanvas and
 *      runs inference at whatever rate it can sustain (it does not queue -
 *      a frame message arriving mid-inference is simply dropped, since the
 *      recognizer is not re-entrant).
 *   3. Worker posts back `ready`, `result` (raw per-hand landmarks/gesture/
 *      confidence, no filtering), or `error` (model/WASM load failures are
 *      caught here, never thrown, so the caller can fall back to a legacy
 *      motion detector).
 *
 * Asset loading (WASM fileset + .task model) defaults to MediaPipe's public
 * CDN. This is deliberate for a static-export app: CDN URLs are absolute and
 * fetched at runtime by the browser, so they are unaffected by Next.js
 * `basePath`/`output: export` and require no assets vendored into `public/`.
 * The paths are still overridable via the `init` message (`wasmBasePath`,
 * `modelAssetPath`) in case a later task chooses to self-host them instead -
 * see the plan's open question about vendoring vs. CDN before changing the
 * defaults.
 */

import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision'

// Version pinned to match the installed @mediapipe/tasks-vision package.
const DEFAULT_WASM_BASE_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const DEFAULT_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

export type Handedness = 'Left' | 'Right'

export interface GestureLandmark {
  x: number
  y: number
  z: number
}

/** Raw per-hand inference output. Not confidence-filtered - that's the consumer's job. */
export interface HandGestureResult {
  handedness: Handedness
  /** 21 hand landmarks, normalized image coordinates. */
  landmarks: GestureLandmark[]
  /** Top-ranked built-in gesture category name (e.g. "Closed_Fist", "Open_Palm", "None"), or null if none reported. */
  gesture: string | null
  /** Confidence of the top-ranked gesture, 0 if none. */
  confidence: number
}

export interface InitMessage {
  type: 'init'
  canvas: OffscreenCanvas
  wasmBasePath?: string
  modelAssetPath?: string
  delegate?: 'GPU' | 'CPU'
  numHands?: number
}

export interface FrameMessage {
  type: 'frame'
  bitmap: ImageBitmap
  timestamp: number
}

export interface CloseMessage {
  type: 'close'
}

export type GestureWorkerIncomingMessage = InitMessage | FrameMessage | CloseMessage

export interface ReadyMessage {
  type: 'ready'
}

export interface ResultMessage {
  type: 'result'
  /** One entry per detected hand. Empty array if no hand was detected this frame. */
  hands: HandGestureResult[]
  timestamp: number
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type GestureWorkerOutgoingMessage = ReadyMessage | ResultMessage | ErrorMessage

/** Narrow a caught value down to a readable message, for posting back via `error`. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/** Pure transform from the MediaPipe result shape to our wire format. Exported for unit testing. */
export function toHandGestureResults(result: GestureRecognizerResult): HandGestureResult[] {
  const { landmarks, gestures, handedness } = result

  return landmarks.map((points, i): HandGestureResult => {
    const topGesture = gestures[i]?.[0]
    const topHandedness = handedness[i]?.[0]

    return {
      handedness: topHandedness?.categoryName === 'Left' ? 'Left' : 'Right',
      landmarks: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      gesture: topGesture?.categoryName ?? null,
      confidence: topGesture?.score ?? 0,
    }
  })
}

// --- Worker runtime wiring ---------------------------------------------------
// Typed loosely and accessed through `ctx` rather than augmenting the global
// `self`, since this project's tsconfig uses the `dom` lib (not `webworker`)
// and the two libs conflict if both declared globals are in scope.

interface GestureWorkerScope {
  onmessage: ((event: MessageEvent<GestureWorkerIncomingMessage>) => void) | null
  postMessage: (message: GestureWorkerOutgoingMessage) => void
  close: () => void
}

// `self` only exists in a worker/browser global scope. Guarded so the pure
// helpers above (toErrorMessage, toHandGestureResults) stay importable from a
// plain Node test runner without a DOM/worker environment.
const ctx: GestureWorkerScope | undefined =
  typeof self !== 'undefined' ? (self as unknown as GestureWorkerScope) : undefined

let recognizer: GestureRecognizer | null = null
let canvasCtx: OffscreenCanvasRenderingContext2D | null = null
let inferring = false

async function handleInit(msg: InitMessage): Promise<void> {
  try {
    const context = msg.canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to acquire 2D context on the transferred OffscreenCanvas')
    }
    canvasCtx = context

    const wasmBasePath = msg.wasmBasePath ?? DEFAULT_WASM_BASE_PATH
    const modelAssetPath = msg.modelAssetPath ?? DEFAULT_MODEL_ASSET_PATH
    const delegate = msg.delegate ?? 'GPU'
    const numHands = msg.numHands ?? 2

    const vision = await FilesetResolver.forVisionTasks(wasmBasePath)
    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: 'VIDEO',
      numHands,
    })

    ctx?.postMessage({ type: 'ready' })
  } catch (err) {
    // Model load failure (slow network, WASM unsupported, etc.) - report back
    // rather than throw, so the main thread can fall back to a legacy detector.
    ctx?.postMessage({ type: 'error', message: toErrorMessage(err) })
  }
}

function handleFrame(msg: FrameMessage): void {
  const { bitmap, timestamp } = msg

  if (!recognizer || !canvasCtx) {
    // Not initialized yet (or init failed) - drop the frame, but release the
    // transferred bitmap so the main thread isn't leaking GPU/CPU memory.
    bitmap.close()
    return
  }

  if (inferring) {
    // GestureRecognizer.recognizeForVideo is not re-entrant; if a frame comes
    // in while we're still processing the previous one, drop it rather than
    // queue - inference runs at its own natural rate, not the frame rate.
    bitmap.close()
    return
  }

  inferring = true
  try {
    const canvas = canvasCtx.canvas
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width
      canvas.height = bitmap.height
    }
    canvasCtx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const result = recognizer.recognizeForVideo(canvas, timestamp)
    ctx?.postMessage({ type: 'result', hands: toHandGestureResults(result), timestamp })
  } catch (err) {
    ctx?.postMessage({ type: 'error', message: toErrorMessage(err) })
  } finally {
    inferring = false
  }
}

function handleClose(): void {
  recognizer?.close()
  recognizer = null
  canvasCtx = null
  ctx?.close()
}

// Only wire up message handling when actually running inside a worker scope
// (this module is also imported directly by unit tests for its pure helpers).
if (ctx) {
  ctx.onmessage = (event) => {
    const msg = event.data
    switch (msg.type) {
      case 'init':
        void handleInit(msg)
        break
      case 'frame':
        handleFrame(msg)
        break
      case 'close':
        handleClose()
        break
    }
  }
}
