/**
 * Pure functions bridging raw hand-tracking output (a single 2D/3D wrist
 * position, normalized to [0, 1] image space) to the places
 * `ThresholdView`/`Scene`/`useEnergyAccumulator` used to source from
 * pixel-diff motion detection:
 *
 *   - the 3-zone ambient edge-panel glow (`zoneEnergy`)
 *   - the volumetric extrusion drift (base value still Leva/`extrusion`)
 *   - the session-arc energy accumulator's per-frame `motionMagnitude`
 *
 * No store/React/browser dependency, so all three are unit-testable in
 * isolation (same pattern as `pinch.ts`).
 */

export interface WristPosition {
  x: number
  y: number
  z: number
}

/** Normalized x-position of each zone's center: LEFT, CENTER, RIGHT. */
const ZONE_CENTERS: readonly [number, number, number] = [1 / 6, 1 / 2, 5 / 6]
const ZONE_WIDTH = 1 / 3

/**
 * Map a single wrist position to the legacy 3-slot `[left, center, right]`
 * zone-energy shape the ambient edge-panel glow already renders, so wrist
 * tracking can drive that existing visual without redesigning it.
 *
 * Uses a triangular falloff around each zone's center: a wrist positioned
 * exactly at a zone's center weights that zone at 1, fading linearly to 0 at
 * one zone-width away. Neighboring zones naturally get partial weight when
 * the wrist sits near a boundary, avoiding a hard cut between zones.
 *
 * Returns `[0, 0, 0]` when no hand is detected/tracked.
 */
export function wristPositionToZoneEnergy(
  wrist: WristPosition | null,
  detected: boolean
): [number, number, number] {
  if (!detected || !wrist) return [0, 0, 0]

  return ZONE_CENTERS.map((center) => {
    const distance = Math.abs(wrist.x - center)
    return Math.max(0, Math.min(1, 1 - distance / ZONE_WIDTH))
  }) as [number, number, number]
}

/**
 * Scales a frame-to-frame wrist displacement (in normalized [0, 1] image
 * units) into roughly the same 0-1 range `useEnergyAccumulator`'s legacy
 * pixel-diff `motionMagnitude` produced, so the session-arc charge/drain math
 * downstream doesn't need to change.
 *
 * Tuned empirically: a brisk hand wave covers on the order of 0.1-0.2 of the
 * frame width per frame at 60fps, which this scale maps to roughly 0.6-1.0 -
 * comparable in feel to the old pixel-diff detector's output range for
 * similar motion. Not derived from a formal calibration; adjust `SCALE` if
 * the accumulator's charge/drain feels off in practice.
 */
const SCALE = 5

export function wristDeltaMagnitude(
  current: WristPosition | null,
  previous: WristPosition | null
): number {
  if (!current || !previous) return 0

  const dx = current.x - previous.x
  const dy = current.y - previous.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  return Math.max(0, Math.min(1, distance * SCALE))
}

/**
 * Maps a single wrist position's normalized y-coordinate to a small additive
 * drift for the volumetric extrusion depth. This is deliberately additive,
 * not a replacement: the Leva `extrusion` slider stays the base value, and
 * the caller (`Scene`) adds this on top - e.g. `extrusion + drift` -
 * matching the "small drift on top of the base value" framing used for
 * extrusion, as opposed to the direct-override pattern used for
 * pinchDistance -> threshold.
 *
 * `wrist.y` is normalized image-space [0, 1] with 0 at the top of frame.
 * Raising the hand (smaller y) drifts extrusion up toward +MAX_EXTRUSION_DRIFT;
 * lowering it drifts down toward -MAX_EXTRUSION_DRIFT. A centered hand
 * (y = 0.5) contributes no drift.
 *
 * Returns 0 when no hand is detected/tracked.
 */
const MAX_EXTRUSION_DRIFT = 2

export function wristYToExtrusionDrift(
  wrist: WristPosition | null,
  detected: boolean
): number {
  if (!detected || !wrist) return 0

  const centered = 0.5 - wrist.y // range roughly [-0.5, 0.5], positive = hand raised
  const drift = centered * 2 * MAX_EXTRUSION_DRIFT // scale to [-MAX, +MAX]

  return Math.max(-MAX_EXTRUSION_DRIFT, Math.min(MAX_EXTRUSION_DRIFT, drift))
}

const WARP_RADIUS = 6
const WARP_STRENGTH = 3

// Grid cells near the tracked wrist push toward the viewer; falls off linearly
// to 0 at WARP_RADIUS so the effect stays local to the hand instead of
// warping the whole grid.
export function wristProximityWarp(
  cellX: number,
  cellY: number,
  wrist: WristPosition | null,
  detected: boolean,
): number {
  if (!detected || !wrist) return 0
  const dx = cellX - wrist.x
  const dy = cellY - wrist.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= WARP_RADIUS) return 0
  return (1 - dist / WARP_RADIUS) * WARP_STRENGTH
}
