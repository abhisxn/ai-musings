# Threshold — Proximity (Design)

## Context

Threshold has no real user-to-camera distance signal today. The BRIEF's
"depth estimation" is per-pixel luminance driving extrusion height, not
distance from the camera. Hand tracking (MediaPipe, via
`useGestureTracking.ts`) already reports per-frame landmarks including a
`pinchDistance` continuous value (thumb-to-index fingertip distance), smoothed
through `resolveContinuousValue` and consumed by `ThresholdView.tsx` for the
live threshold slider.

This spec adds a second continuous value of the same kind: `proximity`,
derived from hand span (wrist-to-middle-fingertip distance) as a proxy for
how close the user's hand is to the camera. It becomes a general-purpose
signal consumed by both the audio engine and the visual extrusion, following
the same "derive from landmarks → smooth → store → consume" pattern already
established by `pinchDistance`.

## Signal derivation

- **Landmark pair:** wrist (index 0) → middle fingertip (index 12), via the
  existing `calculateLandmarkDistance` helper in `pinch.ts` (same helper
  already used for pinch's thumb/index pair).
- **Normalization:** fixed empirical range, same style as
  `normalizePinchDistance` — `MIN_HAND_SPAN`/`MAX_HAND_SPAN` constants map the
  raw distance to `[0, 1]`, clamped. Larger span (closer hand) → higher
  proximity.
- **Smoothing:** reuse `resolveContinuousValue(normalized, previous, detected,
  confidence)` unchanged — no new smoothing logic.
- **No-hand behavior:** when `detected` is false, pass `0` as the target
  (instead of holding `previousProximity` the way `pinchDistance` holds its
  last value). `resolveContinuousValue`'s existing smoothing then eases
  proximity back toward 0 over a few frames rather than snapping — decay is a
  side effect of the existing smoothing curve, not new logic.

## Implementation surface

### Core gesture pipeline
- **`vision/pinch.ts`** — no change; `calculateLandmarkDistance` and
  `resolveContinuousValue` are reused as-is.
- **`vision/useGestureTracking.ts`**:
  - Add `MIDDLE_TIP_INDEX = 12` alongside the existing landmark index
    constants.
  - Add `MIN_HAND_SPAN`/`MAX_HAND_SPAN` constants and a
    `normalizeHandSpan(raw)` function (mirrors `normalizePinchDistance`).
  - In `applyResult`, compute `handSpan` from
    `calculateLandmarkDistance(hand.landmarks[WRIST_INDEX],
    hand.landmarks[MIDDLE_TIP_INDEX])` when a hand is detected, normalize it,
    and resolve it through `resolveContinuousValue` the same way
    `pinchDistance` is resolved — except the no-hand branch targets `0`
    instead of `previousProximity`.
  - Add `previousProximity` to the carried-across-frames state (alongside
    `previousPinchDistance`).
  - `setHandTracking` call gains a `proximity` field.

### Store / types
- **`types.ts`** — `HandTracking` interface gains `proximity: number`.
- **`store.ts`** — no structural change beyond the type; `handTracking`
  already flows through `setHandTracking` as a whole object.

### Visual (`Scene.tsx`)
- New constant `PROXIMITY_EXTRUSION_BOOST` (start ~0.5).
- Extrusion calc becomes a multiplier on top of the existing wrist-drift sum:
  `(extrusion + wristYToExtrusionDrift(wrist, detected)) * (1 +
  handTracking.proximity * PROXIMITY_EXTRUSION_BOOST)`.
- Gated the same way the existing drift is — only applied when
  `gestureTrackingStatus === 'active'`.

### Audio (`audio.ts`)
- One new `Tone.Filter` (lowpass), inserted on the master bus between
  `masterGainRef` and `toDestination()` — a single node, not per-texture.
- Proximity maps to cutoff frequency: `proximity=0` → ~800Hz (muffled),
  `proximity=1` → ~8000Hz (bright/open), linear interpolation.
- Cutoff updates use Tone's `.rampTo()` (short ramp, e.g. 100ms) to avoid
  zipper noise on fast proximity changes.
- Filter is created once alongside `masterGainRef` initialization and
  disposed alongside it.

### HUD / debugging
- **`ThresholdView.tsx`** — the existing Leva hand-tracking monitor group
  (where `handTracking.gesture` is shown) gains a `proximity` readout for
  tuning. Debug-only, not a user-facing control.

### Tests
- Unit tests for `normalizeHandSpan` (clamping at both ends, mid-range
  interpolation) mirroring existing `normalizePinchDistance` tests.
- Extend the gesture-tracking hook test harness with a case verifying
  proximity decays toward 0 across frames after a hand is lost, and resolves
  toward the normalized hand-span value while a hand is held steady.

## Out of scope

- Discrete threshold-crossing triggers (e.g. auto view-mode switch on "close"
  proximity) — proximity stays a continuous signal only in this pass.
- Bounding-box-based hand-size measurement.
- Auto-calibration of the hand-span range.
- Face tracking / any always-on (no-hand) proximity source.
- Per-texture audio filter changes — only the single master-bus filter.
