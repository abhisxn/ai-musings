# Threshold — Gesture Remap v2 (Design)

## Context

The current gesture vocabulary (FIST / OPEN_PALM / PINCH) was debugged this
session: the runtime (`useGestureControls.ts`) was already correct — FIST
cycles render mode, OPEN_PALM toggles the Session Arc, PINCH is reserved for
live threshold control — but the onboarding walkthrough, its tests, and
`GLOSSARY.md` had drifted to document a stale mapping (OPEN_PALM → theme,
PINCH → arc). That drift is fixed as of this session.

This spec is a follow-up feature request, not a bugfix: introduce two new
gestures (THUMB_UP, THUMB_DOWN) using MediaPipe's built-in gesture
classifier, and reassign FIST to a new action now that render-mode cycling
moves to the thumb gestures.

Wave was considered and rejected: MediaPipe's built-in classifier only
recognizes `None, Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, Thumb_Up,
Victory, ILoveYou` — no wave. A wave gesture would require a custom
motion-based detector (tracking wrist x-position oscillation over a time
window, in the same spirit as how `pinch` is already custom-derived from
fingertip distance rather than the built-in classifier). Thumb_Up/Thumb_Down
are both already in the built-in classifier, so no custom detector is
needed — same tier of effort as the existing FIST/OPEN_PALM wiring.

## Final gesture → action mapping

| Gesture | Action | Color | Emoji |
|---|---|---|---|
| FIST | toggle flat ↔ volumetric view (`viewMode`) | green `#00ff41` (unchanged) | ✊ |
| OPEN_PALM | toggle Session Arc (`moodEnabled`) — unchanged | cyan `#00ffff` (unchanged) | 🖐️ |
| PINCH | threshold control (continuous, unchanged — handled in `ThresholdView.tsx`, not the gesture-control hook) | orange `#ff4400` (unchanged) | 🤏 |
| THUMB_UP | next render mode (`RENDER_MODES` forward) | yellow `#ffff00` | 👍 |
| THUMB_DOWN | previous render mode (`RENDER_MODES` backward) | magenta `#ff00ff` | 👎 |

Color rationale: existing gesture colors already read as clean RGB-channel
combinations (fist = pure green, open_palm = cyan = green+blue). The two new
gestures extend that system with the remaining clean dual-channel colors
(yellow = red+green, magenta = red+blue). Pinch's orange (`#ff4400`) is not a
clean channel color but is left unchanged — it's the already-shipped color
across onboarding, the HUD reticle, and docs, and changing it is out of scope
for this feature.

FIST previously cycled render mode; that job moves to the thumb gestures,
freeing FIST for the view-mode toggle, which today is reachable only via the
`Space` key. FIST (a decisive, "committing" gesture) is a good match for the
most dramatic visual switch in the app (flat plane vs. extruded volumetric
depth).

## Implementation surface

### Core gesture pipeline
- **`vision/pinch.ts`** — extend the `Gesture` union:
  `'fist' | 'open_palm' | 'pinch' | 'thumb_up' | 'thumb_down' | null`.
  `detectGestureEdge` is already generic over `Gesture` and needs no change.
- **`vision/useGestureTracking.ts`** — add two entries to `RAW_GESTURE_MAP`:
  `Thumb_Up: 'thumb_up'`, `Thumb_Down: 'thumb_down'`. These map directly from
  MediaPipe's built-in classifier output, same as the existing
  `Closed_Fist`/`Open_Palm` entries — no new detection logic required.
- **`useGestureControls.ts`**:
  - `fist` case changes from `setRenderMode(nextRenderMode(renderMode))` to
    toggling `viewMode` between `'flat'` and `'volumetric'`.
  - New `thumb_up` case: `setRenderMode(nextRenderMode(renderMode))` (moves
    FIST's old behavior here, unchanged logic).
  - New `thumb_down` case: `setRenderMode(prevRenderMode(renderMode))`, where
    `prevRenderMode` is a new exported function mirroring `nextRenderMode`'s
    wrap-around (walks `RENDER_MODES` backward, wrapping from index 0 to the
    last index).
  - The hook needs `viewMode`/`setViewMode` pulled from the store (not
    currently read there).

### UI / HUD
- **`ThresholdView.tsx`**:
  - `GESTURE_RETICLE_COLORS` gains `thumb_up: '#ffff00'`,
    `thumb_down: '#ff00ff'`.
  - The Leva "Gesture" monitor's inline gesture→label object (around the
    `handTracking.gesture` monitor) gains entries for the two new gestures
    and updates the `fist` label from "cycle render mode" to
    "toggle flat/volumetric".

### Onboarding walkthrough
- **`onboardingSteps.ts`**:
  - `GESTURE_ACTIONS` grows from 3 to 5 rows, `fist`'s action text updates to
    reflect the view-mode toggle.
  - `GESTURE_SWATCHES` grows from 3 to 5 entries, adding `thumb_up`/
    `thumb_down` with the colors/emoji above.

### Docs
- **`GLOSSARY.md`** — gesture reference table updated to the 5-gesture
  mapping.

### Tests
- **`onboarding.test.ts`** — update the FIST assertion, add THUMB_UP/
  THUMB_DOWN assertions, update the gesture-order assertion to 5 entries.
- **`gestureControls.test.ts`** — add `prevRenderMode` tests mirroring the
  existing `nextRenderMode` tests (wraps correctly, full-cycle permutation).
  Existing `nextMoodEnabled` tests are unaffected (still driven by
  OPEN_PALM).
- **`useGestureControlsHook.test.ts`** — extend the `applyGestureEdge`
  harness with `thumb_up`/`thumb_down` cases and update the `fist` case to
  toggle `viewMode` instead of dispatching render mode; update/add
  describe blocks accordingly.

## Out of scope

- Wave gesture / any custom motion-based gesture detector.
- Changing PINCH's behavior or its established orange color.
- Any change to the continuous `pinchDistance` → threshold-slider wiring in
  `ThresholdView.tsx`.
- Recoloring existing gestures for full RGB-channel-system consistency
  (e.g., recoloring pinch to pure red) — considered and explicitly rejected
  in favor of leaving shipped colors alone.
