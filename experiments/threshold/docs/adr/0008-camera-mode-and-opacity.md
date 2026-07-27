# ADR 0008 — Camera view enum + on/off + bleed-only opacity

## Status

Accepted (Phase 6 PR1 REV 2).

## Context

Original Phase 5 replaced the small-corner webcam PIP with a boolean
`showCameraBackground` and hardcoded opacity. REV 1 of the Phase 6
spec proposed a 3-mode enum (off | pip | bleed). The user corrected
to: the camera should be selectable **between** PIP and BLEED (the
two non-off states), with OFF as a **kill switch** that works
regardless of which view is currently selected. The opacity slider
applies **only to BLEED** (PIP is always at 100% to remain legible as
a thumbnail).

The 3-mode enum conflates "what to show" (view) with "show anything
at all" (on/off), forcing OFF to mean "switch back to what was being
shown before" rather than a true kill switch — and the kill switch
behavior the user wants requires a real boolean toggle independent of
the view.

## Decision

Replace the boolean with two orthogonal state dimensions:

- `cameraView: 'pip' | 'bleed'` — what shape the live feed takes
  when on. Default `'bleed'`.
- `cameraOn: boolean` — kill switch. Default `true`.
- `cameraOpacity: number` (0..1) — affects BLEED only. Default `0.3`.

UI structure:

- HUD: 3 buttons (PIP / BLEED / ON-OFF). Clicking PIP or BLEED both
  sets the view and auto-enables the camera (so users always have a
  way back to ON without needing a separate "always-on" click).
- Leva `View → Camera` folder: `view` dropdown, `on` toggle,
  `opacity` slider with conditional `render: () => cameraOn &&
  cameraView === 'bleed'` so the slider is hidden when not relevant.

## Consequences

- Each control is one decision. `cameraView` answers "pip or bleed",
  `cameraOn` answers "anything at all", `cameraOpacity` answers
  "how transparent".
- The PIP is always 100% opacity regardless of the slider — this is
  intentional (thumbnail legibility) and documented in the smoke
  checklist.
- The 3 HUD buttons take ~400px horizontal at top-right; the BLEED
  preview fills the viewport so the buttons overlay it. With the
  BLEED-style buttons at top-right they do not overlap the grid (grid
  is below the buttons in z-order).
- The hidden gesture-capture `<video>` elements (in onboarding and
  the always-mounted main-scene hidden video) are untouched — they
  exist solely to feed MediaPipe and don't render to the user.

## Alternatives considered

- 3-mode enum (`off | pip | bleed`) — REV 1. Rejected: forces OFF
  to mean "remember the previous view", which doesn't match the
  user's mental model of an independent kill switch.
- Two separate components with their own state (`PipCamera`,
  `BleedCamera`). Rejected: doubles the code paths for the same
  `<video>` element, no real benefit.
