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
// Relative (not the `@/*` alias) so this resolves under both the Next.js
// webpack build and the plain vitest/Node test runner, which doesn't share
// Next's path-alias config.
import rootPackageJson from '../../../../package.json'

// `@mediapipe/tasks-vision`'s own package.json isn't importable here: its
// "exports" map only exposes the bundle entrypoints and a handful of wasm
// files, not "./package.json" - so we can't read the *actually-resolved*
// installed version directly (verified: both `tsc` and webpack's exports-map
// resolution reject that subpath). Instead we derive the CDN version segment
// from *our own* package.json's dependency entry, which is the single place
// this project pins the version. This still collapses what used to be two
// independently-editable literals (the dependency range and the hardcoded
// CDN URL) into one - bump the version in package.json and the CDN URL
// follows automatically - it just doesn't protect against the WASM drifting
// out of sync with whatever `npm update` resolves *within* the caret range
// without touching package.json. If that residual gap matters, pin the
// dependency with an exact version (no `^`) instead of a range.
function resolveMediapipeVisionVersion(): string {
  const raw = (rootPackageJson as { dependencies?: Record<string, string> }).dependencies?.[
    '@mediapipe/tasks-vision'
  ]
  const match = raw?.match(/\d+\.\d+\.\d+/)
  if (!match) {
    throw new Error(
      `Could not resolve @mediapipe/tasks-vision version from package.json (got "${raw}")`
    )
  }
  return match[0]
}

const DEFAULT_WASM_BASE_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${resolveMediapipeVisionVersion()}/wasm`
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
  /**
   * Which stage the failure happened in - the main-thread consumer needs
   * this to decide policy: an `init` failure means the model/WASM never
   * loaded, so it should permanently fall back to a legacy detector; a
   * `frame` failure is a one-off glitch on an already-running recognizer,
   * so it can just keep going.
   */
  phase: 'init' | 'frame'
  message: string
}

export type GestureWorkerOutgoingMessage = ReadyMessage | ResultMessage | ErrorMessage

/** Narrow a caught value down to a readable message, for posting back via `error`. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    const json = JSON.stringify(err)
    // JSON.stringify returns `undefined` (not the string "undefined") for
    // values like `undefined`, functions, and symbols - fall back rather
    // than violate this function's `string` return type.
    return json !== undefined ? json : String(err)
  } catch {
    return String(err)
  }
}

/** Build the `error` message posted back for a given failure phase. Exported for unit testing. */
export function toErrorWorkerMessage(phase: 'init' | 'frame', err: unknown): ErrorMessage {
  return { type: 'error', phase, message: toErrorMessage(err) }
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
    ctx?.postMessage(toErrorWorkerMessage('init', err))
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
    ctx?.postMessage(toErrorWorkerMessage('frame', err))
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
