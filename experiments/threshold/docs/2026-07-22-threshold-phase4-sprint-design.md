# Threshold — Phase 4: Sprint Design (Legibility, Performance, Mix, Polish)

## Context

Phase 3 (complete, merged) shipped audio reliability repair, gesture-reactive controls, a guided onboarding walkthrough, and a visual-polish pass (lighting/post-fx/typography/chrome). It was verified working end to end.

After living with the shipped build, the user found 8 further problems, each grounded in direct code inspection below (not speculation):

1. Laptop fan spins up / runs hot — a real performance cost, not a taste complaint.
2. "ARC" (Session Arc / mood mechanic) has unclear value — user doesn't understand what it does or why it matters.
3. Sound textures (Bloom/Glitch/Bass) and their relationship to visual post-fx of similar names is unclear.
4. The "mood cycle" (luminous/deep/pulse) is confusing on its own.
5. Gesture-driven changes (FIST/OPEN_PALM/PINCH) don't visibly update the Leva UI controls in real time.
6. Onboarding text-only gesture instructions would benefit from hand emoji.
7. Most render modes look visually similar (dots/pixel/blocks converge); the "lines" mode should be horizontal, not vertical.
8. Sound texture is inaudible at the default volume (75) and barely reacts to anything; reactivity should shift pitch/scale in sync with "harmony" (the app's other reactive state).
9. Overall polish bar: should read as agency-grade, not amateurish.

Scope was narrowed through brainstorming with the user:
- Performance fix: remove the single most expensive post-fx pass (`DepthOfField`) and throttle MediaPipe inference to every 2nd-3rd frame, rather than adding a new user-facing quality toggle or a full profiling pass.
- The Session Arc mechanic: **direct code inspection during this brainstorm found an automatic, motion-energy-driven `Phase` engine (`useEnergyAccumulator.ts`) already exists and is already wired into color/material/audio** — it is not a manual toggle needing new automatic behavior. The actual gap is legibility: it's invisible in the UI and confusingly named alongside the separate, purely manual `currentMood` palette selector. Track C is scoped to surfacing/disambiguating the existing mechanic, not building a new one.
- Sound-texture reactivity: pitch/scale changes should follow the same render-mode/theme/gesture-edge state already driving the visuals, so sound and visuals read as one reactive system (per user's explicit choice, over a raw-camera-signal or hybrid approach).
- Render-mode differentiation: scoped to a targeted shape pass (distinct silhouette rule per mode) plus the horizontal-lines fix, not a full visual-language redesign (which risks reopening Phase 2's already-shipped work).

Explicitly out of scope: rebuilding the energy-accumulator's motion-detection logic, a user-facing performance/quality toggle, any new render-mode geometry beyond differentiating existing ones, remixing instrument choice/timbre.

## Current-state findings (grounding for this design)

From direct code inspection prior to writing this design:

- **Leva desync (item 5)**: `ThresholdView.tsx:307-361` calls `useControls('Visuals', { render: folder({ mode: { value: renderMode, ... } }) })` (and similarly for theme/mood) with no dependency array. Leva's `value` field only seeds a control's *initial* display value — it does not resync when the underlying variable changes elsewhere in React. So when `useGestureControls.ts` calls `setRenderMode()` on a FIST edge, the store updates and `Scene.tsx` re-renders correctly (it reads the store directly), but the Leva panel's dropdown keeps showing the stale value. Same applies to the `theme` and `mood` controls in the same folder. Fix: capture the `set` function `useControls` returns and call it imperatively in a `useEffect` keyed on `[renderMode, theme, moodEnabled]`.
- **Performance (item 1)**: `ThresholdView.tsx:596-608` chains 7 post-processing passes every frame inside `EffectComposer`: `Bloom` (with `mipmapBlur`, itself multi-pass), `HueSaturation`, `ChromaticAberration`, `DepthOfField` (renders its own depth buffer + multiple blur passes — the single most expensive effect in the library), `Glitch`, `Scanline`, `Noise`, `Vignette`. This runs concurrently with MediaPipe hand-tracking inference, which currently runs every single frame with no throttle. Combined, this is the confirmed cause of sustained high GPU/CPU load.
- **Session Arc (items 2, 4)**: `types.ts:1-2` defines `Mood = 'luminous' | 'deep' | 'pulse'` (manual, cycled via the 'm' keyboard shortcut and the Leva `render.mood` boolean — actually `moodEnabled` gates the system, `currentMood` selects the palette) and `Phase = 'calm' | 'active' | 'climax'` (automatic). `useEnergyAccumulator.ts:34-49` runs a real-time loop: while `moodEnabled` is true, it accumulates an `energy` value from frame-to-frame wrist displacement (when hand-tracking is active) or raw pixel-diff motion (fallback), charging at `CHARGE_RATE=2`/draining at `DRAIN_RATE=0.5` per frame, clamped 0-100, with hysteresis bands mapping energy to `Phase` (`<35` calm, `35-70` active, `>70` climax, with dead-zone thresholds at the boundaries to prevent flicker). `Scene.tsx:79-106,153,306` and `ThresholdView.tsx:260,550-551` already consume `currentPhase` to drive `PHASE_COLORS`, material roughness/metalness, and (via `audio.ts:210-215`) `PHASE_VOLUMES` and tempo. This is a legitimate, already-functioning arc mechanic — it is not exposed anywhere in the UI as a named, explained concept, and its naming ("phase") is easily confused with the separate manual "mood" (palette) selector.
- **Sound texture inaudibility (item 8, mix)**: `audio.ts:177` maps the 0-100 volume control linearly to dB: `(volume/100)*60-60`. At the default of 75, this alone already applies **-15dB** at the master destination (`Tone.getDestination().volume`). This stacks on top of individual per-layer gains already set at **-10 to -18dB** relative to their synth sources (e.g. `audio.ts:56,69,77,92,101,109,123,131,139`). The combined effect is up to -33dB of attenuation below design level at the default volume — the root cause of "barely plays." The linear-to-dB mapping is also non-perceptual (human loudness perception is closer to logarithmic).
- **Sound texture non-reactivity (item 8, reactivity)**: no code currently maps `renderMode`/`theme`/gesture edges to any audio pitch or scale parameter — texture selection (`soundTexture`) and phase/mood are the only inputs `audio.ts` reads today (`audio.ts:28`). This confirms there is no existing reactivity to build on; it's new, additive logic.
- **Render mode convergence (item 7)**: `Scene.tsx:217-241` sets `dummy.scale` per mode. In flat view, `blocks`/default fall to `spacing*s, spacing*s, 0.05` and `pixel`/`ascii` to `spacing*s, spacing*s, 1` — nearly identical square silhouettes, differing only by per-cell color mapping (`getGradientColor`, `Scene.tsx:248`). `lines` (`Scene.tsx:222-223`) is already distinct in principle (`width: spacing*0.15` fixed, `height: spacing*s*(0.5+brightness)` variable) but this produces **vertical** bars, not the horizontal bars the user wants — a scale-axis swap.

## Architecture: 6 tracks, sub-agent worktree-parallel (mirrors Phase 3's shape)

```
Track A — Leva Live-Sync            (ThresholdView.tsx: Visuals > render folder)
Track B — Performance                (ThresholdView.tsx: post-fx/inference throttle, vision/useGestureTracking.ts)
Track C — Arc Legibility             (ThresholdView.tsx: new ARC indicator + Leva label; OnboardingOverlay.tsx: copy)
Track D — Audio Mix + Reactivity     (audio.ts only)
Track E — Render Mode Differentiation (Scene.tsx only)
Track F — Onboarding Polish          (OnboardingOverlay.tsx: hand emoji)
```

### Sequencing rule (the one real conflict in this sprint)

Tracks A and C both edit the same Leva `useControls('Visuals', { render: folder({...}) })` block in `ThresholdView.tsx` (A fixes sync via `set()`, C relabels the `mood` control to `palette` and adds a monitor-style ARC indicator nearby). **Track C merges first** — its diff there is label-only and small. **Track A rebases onto main immediately after**, mirroring the Phase 3 A-before-B resolution for the same kind of Leva-block overlap. Merge order: **C, A, then B/D/E/F in any order** (all four are file- or region-disjoint from each other and from A/C).

One deliberate shared read, no write conflict: Track A's `useEffect` reads `renderMode`/`theme`/`moodEnabled` from the store (already read elsewhere); Track C's ARC indicator reads `sessionEnergy`/`currentPhase` (already read elsewhere). Neither writes to state the other track owns.

## Track A — Leva Live-Sync

Capture the `set` function `useControls` returns for the `Visuals` block. Add a `useEffect` keyed on `[renderMode, theme, moodEnabled]` that calls `set({ 'render.mode': renderMode, 'render.theme': theme, 'render.mood': moodEnabled })` whenever any of these change from a source other than the panel itself (i.e., from gesture or keyboard). This is the standard Leva pattern for externally-driven controls. No change to the gesture/keyboard logic itself — purely a display-sync fix.

## Track B — Performance

- Remove the `<DepthOfField>` element from the `EffectComposer` chain (`ThresholdView.tsx:603`).
- In `vision/useGestureTracking.ts`, throttle the MediaPipe inference call to run on every 3rd animation frame (skip 2, run on the 3rd) instead of every frame — gesture detection and wrist-position tracking remain responsive at ~20fps effective rate, well within human gesture timing, while cutting inference cost by roughly two-thirds.
- No other post-fx or inference changes.

## Track C — Arc Legibility

- Add a small, labeled ARC indicator (e.g. near the existing phase-color swatch at `ThresholdView.tsx:550-551`) showing the current stage name (CALM / ACTIVE / CLIMAX) as text, plus a thin energy-meter bar reading `sessionEnergy` (0-100) — both values already in the store, no new state.
- Relabel the Leva `render.mood` boolean control and its tooltip from "mood" to "palette" (or similarly disambiguating copy), and update `currentMood`'s keyboard-shortcut help text/onboarding copy to describe it as a palette choice, distinct from the automatic ARC.
- Add one onboarding step (or extend an existing one) explaining: "Moving your hand builds energy — the ARC shifts from calm to climax automatically, changing color, material, and sound together."
- No changes to `useEnergyAccumulator.ts`'s accumulation logic, hysteresis thresholds, or `Phase`/`Mood` type definitions.

## Track D — Audio Mix + Reactivity

- **Mix fix**: replace the linear `(volume/100)*60-60` dB mapping with a perceptual curve (e.g. an exponential/log curve such as `20 * Math.log10(volume/100)` clamped at a sane floor, or a simpler perceptual lookup) so the default of 75 reads as clearly audible rather than -15dB-attenuated on top of already-quiet layer gains. Reduce or remove the compounding effect by raising per-layer gains modestly (e.g. -6 to -10dB range instead of -10 to -18dB) so the two attenuation stages don't stack destructively.
- **Reactivity**: add pitch/scale modulation driven by the same state already reactive elsewhere — `renderMode`, `theme`, and `handTracking.gesture` edges. Concretely: map each `renderMode`/`theme` combination to a small pitch offset or scale-degree shift applied to the melody/accent synths' note selection (via the existing `MarkovMelody`/scale config in `mood-config.ts`), and trigger a brief pitch "flourish" on each gesture edge (FIST/OPEN_PALM/PINCH), mirroring how Track B (Phase 3) already triggers a visual glitch on the same edges. This reuses the existing gesture-edge read pattern from `useGestureControls.ts` — no new store fields needed beyond what a `useEffect` watching `handTracking.gesture` requires.

## Track E — Render Mode Differentiation

- **Lines → horizontal**: swap `Scene.tsx:222-223`'s scale axes so width becomes the brightness-variable dimension and height becomes the fixed thin dimension (mirroring the volumetric branch's already-correct pattern at `Scene.tsx:236-237` structurally, but for the flat-view horizontal case).
- **Shape differentiation audit**: give `blocks` and `pixel` (currently near-identical square silhouettes) one clear distinguishing rule each — e.g. `blocks` keeps a full square fill, `pixel` gets a visibly smaller inset/gap per cell (a "pixelated" look distinct from solid blocks) via an adjusted scale multiplier. `dots` (circular via geometry), `ascii` (glyph atlas), `radio` (ring+dot), and `spectral` (soft sprite) are already visually distinct per Phase 2 — no change needed there, confirmed by their existing distinct geometry/material handling in `Scene.tsx`.

## Track F — Onboarding Polish

Add a hand emoji (✊ for FIST, 🖐 for OPEN_PALM, 🤏 for PINCH) alongside each gesture's existing text label in `OnboardingOverlay.tsx`'s step 3 content, next to the existing per-gesture swatch colors — purely additive, no logic change.

## Testing strategy

- **Track A**: unit-testable — assert that a store change (simulating a gesture-driven `setRenderMode` call) results in a call to Leva's `set()` with the matching value, following the same test pattern Phase 3's Track B established for `useGestureControls.ts`.
- **Track B**: live verification only (real `AudioContext`/GPU) — confirm reduced CPU/GPU load via browser dev tools, confirm `DepthOfField` visually absent, confirm gesture detection still responds promptly at the throttled rate.
- **Track C**: the ARC indicator's text/color mapping from `currentPhase`/`sessionEnergy` is a pure display function — unit-testable. The onboarding copy addition is manual-verification only.
- **Track D**: the dB-mapping fix is a pure function — unit-testable (assert perceptual curve output at key volume values). Pitch/scale reactivity to mode/theme/gesture is live-verification only (real `AudioContext`).
- **Track E**: live visual verification — cycle all 7 render modes and confirm each is visually distinguishable from its neighbors; confirm lines render horizontally in both flat and volumetric view.
- **Track F**: manual onboarding walkthrough check.

All tracks gate on the existing `vitest run` + `tsc --noEmit` checks, matching Phase 3's verification bar. No Phase 3 shipped surface is being rebuilt — this sprint is fix-and-refine on top of it, so no regression risk to Phase 3's shipped audio/gesture/onboarding/visual-polish behavior beyond what each track explicitly touches.

## Verification (end to end, live app)

- Leva panel's mode/theme/mood controls visibly update within one frame of a FIST/OPEN_PALM/PINCH gesture firing.
- CPU/GPU load visibly drops with `DepthOfField` removed and throttled inference; fan/heat improves (subjective, user-confirmed).
- ARC indicator visibly progresses CALM → ACTIVE → CLIMAX as hand motion increases, with a visible energy meter; "palette" (mood) control is clearly labeled distinct from ARC.
- Default volume (75) is clearly audible; sound texture pitch/scale audibly shifts with render mode/theme changes and gesture edges.
- Lines render mode shows horizontal bars in both flat and volumetric view; blocks and pixel modes are visually distinguishable from each other and from dots/ascii/radio/spectral.
- Onboarding gesture step shows hand emoji alongside text.
- `vitest run` passes (existing + new unit tests for A/C/D pure-function logic); `tsc --noEmit` clean.

### Critical files

- `experiments/threshold/src/ThresholdView.tsx` — Track A (Leva sync), Track B (post-fx removal), Track C (ARC indicator + Leva label) — see sequencing rule
- `experiments/threshold/src/vision/useGestureTracking.ts` — Track B (inference throttle)
- `experiments/threshold/src/OnboardingOverlay.tsx` — Track C (copy), Track F (hand emoji)
- `experiments/threshold/src/audio.ts` — Track D (mix fix + reactivity)
- `experiments/threshold/src/mood-config.ts` — Track D (reference, scale/tempo config reused for reactivity)
- `experiments/threshold/src/Scene.tsx` — Track E (shape differentiation)
- `experiments/threshold/src/useEnergyAccumulator.ts` — Track C, reference only, not modified
- `experiments/threshold/src/types.ts` — reference only (`Mood`/`Phase` types), not modified
- `experiments/threshold/src/__tests__/` — new unit tests for Track A (Leva sync), Track C (ARC display function), Track D (dB curve)
