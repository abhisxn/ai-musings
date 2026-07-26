export type Mood = 'luminous' | 'deep' | 'pulse' | 'solar' | 'azure'
export type Phase = 'calm' | 'active' | 'climax'

export interface HandTracking {
  detected: boolean
  wrist: { x: number; y: number; z: number } | null
  pinchDistance: number
  gesture: 'fist' | 'open_palm' | 'pinch' | null
  confidence: number
}

/**
 * Lifecycle status of `useGestureTracking`'s MediaPipe worker, surfaced via
 * the store so other hooks/components can decide fallback behavior without
 * prop-drilling (see `useMotionZones`, `useEnergyAccumulator`,
 * `ThresholdView`):
 *   - `idle`: not yet started (no camera/video element yet).
 *   - `loading`: worker created, awaiting `init`/model load.
 *   - `active`: model loaded and producing (or attempting) per-frame results.
 *   - `failed`: `init` failed permanently (model/WASM load error) - fall back
 *     to the legacy `useMotionZones` pixel-diff detector for the session.
 */
export type GestureTrackingStatus = 'idle' | 'loading' | 'active' | 'failed'
