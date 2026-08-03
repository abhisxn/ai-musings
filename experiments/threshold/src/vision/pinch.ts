/**
 * Pure functions for hand-gesture input intelligence: pinch-distance
 * normalization and edge-detection for discrete gesture transitions.
 *
 * No MediaPipe dependency — operates on plain landmark coordinates so it can
 * be unit-tested in isolation and reused regardless of which vision library
 * produces the landmarks.
 */

/** A single hand landmark point, in MediaPipe's normalized [0, 1] image space. */
export interface Landmark {
  x: number
  y: number
  z: number
}

/** The vocabulary of discrete, edge-triggered gestures this experiment recognizes. */
export type Gesture = 'fist' | 'open_palm' | 'pinch' | 'thumb_up' | 'thumb_down' | null

/** Which discrete gesture(s) a transition entered and/or exited on this frame. */
export interface GestureTransition {
  entered: Exclude<Gesture, null> | null
  exited: Exclude<Gesture, null> | null
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6
const DEFAULT_MIN_PINCH_DISTANCE = 0.02
const DEFAULT_MAX_PINCH_DISTANCE = 0.3
const DEFAULT_PINCH_THRESHOLD = 0.15

/** Euclidean distance between two landmarks in 3D normalized space. */
export function calculateLandmarkDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** Clamp a value to the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Normalize a raw thumb-tip↔index-tip distance into a 0-1 range, where 0 is
 * the closest the fingertips are expected to get (pinched) and 1 is the
 * farthest apart they're expected to spread. Values outside [min, max] are
 * clamped rather than extrapolated.
 *
 * If maxDistance <= minDistance (a misconfigured calibration), returns 0
 * rather than dividing by zero/negative and producing NaN or Infinity.
 */
export function normalizePinchDistance(
  rawDistance: number,
  minDistance: number = DEFAULT_MIN_PINCH_DISTANCE,
  maxDistance: number = DEFAULT_MAX_PINCH_DISTANCE
): number {
  if (maxDistance <= minDistance) return 0
  const clamped = clamp(rawDistance, minDistance, maxDistance)
  return (clamped - minDistance) / (maxDistance - minDistance)
}

/**
 * Derive the discrete "pinch" gesture from a normalized pinch distance.
 * Pinch isn't produced by MediaPipe's built-in gesture classifier (which
 * only classifies fist/open-palm), so it's computed here from fingertip
 * distance instead.
 */
export function derivePinchGesture(
  normalizedDistance: number,
  threshold: number = DEFAULT_PINCH_THRESHOLD
): 'pinch' | null {
  return normalizedDistance <= threshold ? 'pinch' : null
}

/**
 * Resolve the discrete gesture to report this frame. Low confidence or an
 * out-of-frame hand resolves to null (no gesture), since we can't trust a
 * discrete recognition enough to fire a one-shot "moment" event from it.
 */
export function resolveGesture(
  rawGesture: Gesture,
  detected: boolean,
  confidence: number,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Gesture {
  if (!detected || confidence < confidenceThreshold) return null
  return rawGesture
}

/**
 * Resolve a continuous value (pinch distance, hand position, etc.) to report
 * this frame. Unlike discrete gestures, continuous values hold their last
 * known value under low confidence or an out-of-frame hand rather than
 * snapping to zero — that snap would read as visual jitter downstream.
 *
 * Callers own seeding the initial "previous" value (e.g. the store's
 * `pinchDistance: 0` default serves as the first previous value before any
 * frame has been resolved).
 */
export function resolveContinuousValue(
  current: number,
  previous: number,
  detected: boolean,
  confidence: number,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): number {
  if (!detected || confidence < confidenceThreshold) return previous
  return current
}

/**
 * Edge-detect a discrete gesture transition between two frames. Generic
 * across all three discrete gestures (fist, open_palm, pinch) — the caller
 * passes whichever gesture (or null) was resolved on the previous and
 * current frame, and gets back what was entered and/or exited. This is what
 * lets discrete gestures fire one-shot "moment" events on transition rather
 * than repeatedly while held.
 */
export function detectGestureEdge(previous: Gesture, current: Gesture): GestureTransition {
  if (previous === current) {
    return { entered: null, exited: null }
  }
  return {
    entered: current,
    exited: previous,
  }
}
