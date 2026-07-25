# Threshold Phase 5 Sprint — Design

## Context

Threshold is a webcam/gesture-driven audiovisual R3F installation
(`experiments/threshold/`). Phase 4 (merged this session via
`git merge --ff-only threshold-phase4-sprint`) already shipped: horizontal
`lines` render mode, pixel/blocks footprint differentiation, audio
pitch-shift reactivity, `PHASE_LABELS` (CALM/BUILDING/CLIMAX), perf gating,
and the Leva gesture-sync fix (`levaSync.ts`). This sprint (Phase 5) covers
the remaining UX/design backlog gathered directly from user feedback, plus
one legibility problem discovered during design grounding: several core
mechanics (session-arc phases, sound texture, mood cycle) are functionally
present but invisible to the user, which is the root cause of multiple
reported complaints ("colors keep changing unexpectedly", "I don't
understand ARC/sound texture/mood").

Two bugs were fixed prior to this design and are **not** part of this
sprint (documented here for continuity only):
1. Onboarding-dismiss breaking the app (`videoStreamAttacher.ts` re-attach
   fix in `hooks.ts`).
2. Gesture changes not reflecting in the Leva panel (root cause: the
   completed fix lived on an unmerged branch; resolved by fast-forward
   merging `threshold-phase4-sprint` into `main`).

## Goals

- Make session-arc phase, current mood, and current sound texture legible
  in-experience via a real HUD (not buried in the Leva debug panel).
- Fix the three weakest render modes: `radio`, `ascii`, `spectral`.
- Resolve the root cause of unexpected color shifts (two independent
  coloring systems compositing on the same meshes).
- Redesign Threshold's own intro/start screen (not the AI Musings gallery
  homepage) to match the shipped CRT/glitch/brutalist chrome.
- Move the webcam feed to a full-bleed background layer with a visibility
  toggle.
- Add a depth-driven grid warp proximity feature (real Z-axis parallax,
  not just brightness mapping).
- Deepen sound textures by wiring the currently-dead `textureType` field
  into `audio.ts`, and expand the mood cycle from 3 to 5 moods.
- Restyle the Leva panel and clarify the gestures folder.

## Non-goals

- Rebuilding Leva from scratch (restyle only, using the existing
  `levaTheme` mechanism).
- Changing the AI Musings gallery/homepage.
- Any change to the already-shipped Phase 4 items (horizontal lines,
  pixel/blocks differentiation, pitch-shift reactivity, `PHASE_LABELS`).

## Design

### 1. Legibility HUD (ARC / Mood / Texture)

A persistent, minimal, corner-anchored on-screen readout, separate from
the Leva debug panel, styled with the existing CRT/brutalist visual
language (`VISUAL_STYLEGUIDE`). Shows:
- Current phase label (`PHASE_LABELS`, already exists) — e.g. `BUILDING`.
- Current mood name + a short one-line descriptor, e.g.
  `DEEP — moody, harmonic minor`.
- Current sound texture name.

This directly addresses the "I don't understand ARC/sound
texture/mood" feedback and the "colors keep changing unexpectedly"
complaint (phase/mood-driven color shifts become legible instead of
appearing arbitrary). Component lives alongside `ThresholdView.tsx`,
reads directly from the Zustand store (`currentPhase`, `currentMood`,
`soundTexture`) — no new state needed.

### 2. Render mode fixes: radio, ascii, spectral

- **radio**: replace the current two-mesh-per-cell design (torus ring +
  cylinder dot, `Scene.tsx`) with a single ring per cell, radius/opacity
  driven by brightness, additive glow, no dot. Reframes it as a
  radar/sonar blip field instead of a literal radio button.
- **ascii**: root cause confirmed during grounding — the glyph atlas
  texture (`asciiAtlas` in `dither.ts`) exists, but there is no per-cell
  UV-offset/glyph-selection logic; every cell renders the same static
  texture region. Fix: add an `InstancedBufferAttribute` carrying a
  brightness-bucketed glyph index, patched into the material shader via
  `onBeforeCompile` to offset UVs per instance, so brightness actually
  maps to a specific character.
- **spectral**: currently brightness-driven `THREE.Points` with a soft
  glow sprite — mechanically identical to every other mode's data
  pipeline. Redesign to be the one genuinely audio-native mode: drive
  each column's cells from live FFT bin data (already sampled via
  `analyserRef` for `audioIntensity` in `audio.ts`) instead of pixel
  brightness, turning it into a real spectrum-analyzer bar field.

Out of scope (already resolved by the Phase 4 merge, verified during
grounding): `lines` rendering horizontal, `pixel`/`blocks` footprint
differentiation.

### 3. Color-consistency fix

Root cause: `Scene.tsx` has two independent coloring systems compositing
on the same meshes — `chromeColor` (switches entirely based on
`moodEnabled`, sourced from `PHASE_COLORS[currentPhase]` or theme accent)
drives material emissive, while `getGradientColor` (theme-driven) drives
per-cell diffuse. These can disagree, producing changes that look
arbitrary. Fix: when `moodEnabled` is on, derive the diffuse gradient
from the active mood's `baseHue` (`mood-config.ts`) instead of the
theme's fixed gradient, so both systems agree on a single color source.

### 4. Leva restyle + gesture-folder clarity

- Visual restyle within the existing `levaTheme` mechanism in
  `ThresholdView.tsx` (spacing/typography polish for a more premium
  feel) — not a rebuild.
- Gestures folder: add short inline labels describing what each gesture
  maps to (e.g. "pinch → threshold"), replacing raw control names.

### 5. Intro screen redesign

Threshold's own start/init screen (the `!initialized` branch in
`ThresholdView.tsx`), not the AI Musings gallery homepage. Redesign to
reuse the CRT/glitch/brutalist primitives already shipped in Phase 3
(scanlines, monospace type, signal-bar motifs, `VISUAL_STYLEGUIDE`)
instead of the current plain screen. No new visual language introduced.

### 6. Camera as full-bleed background + toggle

Move the webcam `<video>` feed from its current PIP placement (behind/
competing with UI controls) to a full-bleed background layer beneath the
R3F canvas (`object-fit: cover`, full viewport). Add a toggle (HUD or
Leva `View` folder) to hide/show it. The grid canvas continues to render
on top, unaffected.

### 7. Depth-driven grid warp (proximity)

Approved direction: use the existing motion-zone/gesture proximity
signal to displace each grid cell's Z position (not just its
brightness/color as today), so closer proximity pushes cells toward the
camera — real 3D parallax instead of a flat brightness map. Implemented
in `Scene.tsx`'s per-cell `useFrame` loop alongside existing geometry
updates.

### 8. Sound texture deepening + 2 new moods

- Wire the currently-unused `MoodConfig.textureType`
  (`airy`/`glitch`/`rumble`) into `audio.ts`'s texture builders
  (`buildGlitchTexture`/`buildBloomTexture`/`buildBassTexture`), so
  texture character actually varies by mood instead of only by the
  independent `soundTexture` store field.
- Add 2 new entries to `MOOD_CONFIGS` (`mood-config.ts`), filling the
  open hue ranges left by the existing 3 (green/140°, magenta/300°,
  orange/20°) — candidates: an indigo/blue mood and a gold/yellow mood,
  each with its own scale, tempo range, waveform, and texture type.
  Exact names/musical parameters to be finalized during implementation.
- Update the mood cycle everywhere it's enumerated: `m`/`M` keyboard
  shortcut array in `ThresholdView.tsx`, Leva mood control, and the new
  HUD's mood descriptor list.

### 9. Defaults

In `store.ts`:
- `soundTexture: 'off'` → `'bloom'`
- `currentMood: 'luminous'` → `'deep'`

(`audioReactive` is already `true` by default — no change needed.)

## Data flow / component touch map

- `store.ts` — new/changed defaults; no new state fields required beyond
  what already exists (`currentPhase`, `currentMood`, `soundTexture` are
  all already tracked).
- `Scene.tsx` — radio/ascii/spectral geometry rewrites, diffuse-gradient
  mood-hue fix, Z-displacement for proximity warp.
- `dither.ts` — no change to existing atlas generators; ascii fix is
  additive (new per-instance attribute, same atlas).
- `audio.ts` — texture builders read `MOOD_CONFIGS[currentMood].textureType`
  in addition to `soundTexture`.
- `mood-config.ts` — 2 new `MOOD_CONFIGS` entries.
- `ThresholdView.tsx` — new HUD component mount, Leva restyle/labels,
  mood cycle array update, intro-screen JSX redesign, camera toggle
  control.
- New component (name TBD at implementation time, e.g. `SessionHud.tsx`)
  for the legibility HUD.
- Webcam `<video>` placement moves from its current container to a
  full-bleed background layer — likely a new CSS module class in
  `threshold.module.css` plus a JSX restructure in `ThresholdView.tsx`.

## Testing

- Existing test suite (`vitest run experiments/threshold`, currently
  137/137 passing) must stay green throughout.
- New unit coverage expected for: mood-config additions (shape
  validation matching existing `MoodConfig` interface), texture-type
  wiring in `audio.ts` (mirrors existing `levaSync.test.ts`/
  `audio.test.ts` patterns), and the depth-warp displacement calculation
  if it's extracted as a pure function (matching the existing
  `videoStreamAttacher.ts` pure-extraction pattern used for testability).
- Render-mode geometry changes (radio/ascii/spectral) are visual —
  verified manually in-browser, not unit tested, consistent with how
  `Scene.tsx`'s existing render modes are covered today.

## Process requirements for the implementation plan

These apply to how the plan (produced by `writing-plans`) is structured
and executed, not to the design itself:

- **New branch + git worktrees**, matching the Phase 3/4 parallel-track
  pattern, with each track executed by a subagent in its own worktree.
- **Explicit merge to `main` at the end of the sprint** — the Phase 4
  branch was completed but never merged, which caused the Leva-sync bug
  to persist after being "fixed." The plan must include a final
  fast-forward (or otherwise verified) merge step, not just a "sprint
  complete" doc update.
- **ADR per architecturally-significant decision**, at minimum: the
  dual-coloring-system fix (Section 3), the ASCII per-instance UV
  approach (Section 2), the spectral FFT-driven redesign (Section 2),
  and the texture/mood wiring (Section 8).
- **Graphify update** once the new mood/texture/phase relationships
  exist in code, so the knowledge graph reflects the shipped structure.
- Phased task list, scoped per track, following the existing
  Phase 3/4 track-lettering convention (Track A, B, C...) recorded in
  `experiments/threshold/.context/LOG.md` and `GLOSSARY.md`.

## Open questions for implementation time

- Exact names/scale/tempo/waveform for the 2 new moods (Section 8) —
  left flexible so the implementing subagent can pick musically coherent
  values within the stated hue/character constraints, rather than
  over-specifying here.
- Exact placement/styling detail of the new HUD component (Section 1) —
  constrained to "corner-anchored, CRT/brutalist" but left to
  implementation for pixel-level layout.
