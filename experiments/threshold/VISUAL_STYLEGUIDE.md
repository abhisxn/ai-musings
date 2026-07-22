# Threshold — Visual Styleguide

Scoped to the **Threshold** experiment only (`experiments/threshold/`). This
document is the canonical reference for the HUD chrome established in Phase 3
Track E2. The global CRT scaffolding (`.hud-overlay` / `.hud-scanline` /
`.vignette`, mounted app-wide in `app/layout.tsx`) is **not** repeated here.

## Aesthetic direction

A **brutalist / raw military-instrument HUD** fused with **synthwave / analog
tape** artifacts. Think: a volumetric terminal instrument rendered on a
monochrome CRT — dithered halftone data, machined-panel chrome (not glass),
scanline grain, and momentary VHS glitch on every hand-gesture edge. Craft is
elevated (custom easing, transform/opacity-only motion, z-index discipline),
but the look stays raw and monospaced — no glassmorphism, no soft pastels, no
premium blur.

- **Type:** `Share Tech Mono` (the only font; inherited from the global body —
  no per-experiment font dependency). Typography lives in
  `src/threshold.module.css` as CSS Modules classes.
- **Palette:** driven by `src/theme.ts` (`getTheme`): `background`, `accent`,
  `accentDim`, `gradient`. Session-arc phase colors from `PHASE_COLORS`
  (`calm` green, `active` yellow, `climax` red). Edge-panel + reticle swatches
  use the established magenta / cyan / orange and gesture greens.

## Typography scale

All six classes live in `src/threshold.module.css` and set **size /
letter-spacing / weight only** (font-family is inherited). Replace ad-hoc
`text-[8/9/10px]` / `xs` / `sm` / `lg` / `3xl` Tailwind utilities with these.
Layout-only props (padding, opacity, color) may still use Tailwind.

| Class         | Size | Tracking | Weight | Used for                                              |
| ------------- | ---- | -------- | ------ | ----------------------------------------------------- |
| `hudMicro`    | 8px  | 0.25em   | 500    | corner-bracket ruler ticks, mood-/gesture-swatch labels |
| `hudCaption`  | 10px | 0.2em    | 500    | status bar, depth-meter/timer, signal-bar readout      |
| `hudBody`     | 11px | 0.15em   | 400    | onboarding body copy                                   |
| `hudLabel`    | 13px | 0.3em    | 700    | button / toggle labels (e.g. INITIALIZE)                |
| `hudHeading`  | 15px | 0.3em    | 700    | section headers                                        |
| `hudDisplay`  | 32px | 0.3em    | 800    | boot-screen h1                                         |

## Chrome elements (Track E2)

- **Corner brackets → tick rulers.** Four L-shaped brackets (one per corner)
  each carry 3 perpendicular 1px ticks at 25/50/75% of both arms, colored
  `palette.accentDim` via the `--bracket-color` CSS variable. Pure CSS
  geometry (layered `linear-gradient` backgrounds in `::before`/`::after` — no
  extra DOM spans).
- **Targeting reticle.** Absolutely-positioned crosshair (ring + cross),
  placed by `handTracking.wrist.x/y` (normalized 0–1 image space, x mirrored
  to match the self-view webcam — no 3D projection). Shown only when a hand is
  detected and tracking is active. Pulses through the per-gesture swatch
  color (fist green / open-palm cyan / pinch orange) on each gesture edge via
  the `reticlePulsing` class (`thresholdReticlePulse` keyframe, transform +
  opacity + box-shadow only).
- **Signal-strength bar.** The status label is separated from the confidence
  value; 5 segments render with `Math.ceil(confidence * 5)` lit in
  `palette.accent` and the rest dim (`palette.accentDim`). The numeric percent
  is kept on the container's `title` attribute.
- **VHS glitch.** On each `handTracking.gesture` edge, `setGestureGlitchActive(true)`
  is held for ~200ms (read by Track E1's Glitch post-fx) and toggles the
  `.glitchActive` module class onto the status-bar text — a standalone
  (programmatic, not `:hover`) rule reproducing the global `.glitch-text:hover`
  look (`text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff` + `thresholdGlitch`
  keyframes), self-contained in the module.
- **Neon-glow.** `.neonGlow { box-shadow: 0 0 8px currentColor }` on the
  depth-meter fill and the mood-toggle button — extends the existing
  magenta/cyan/orange palette via `currentColor`; no new colors invented.

## Post-processing chain (canonical order)

The fixed order for the `EffectComposer` stack (present effects are in
`ThresholdView.tsx`; pending effects land with Track E1):

1. **Bloom**
2. **HueSaturation** *(Track E1)*
3. **ChromaticAberration**
4. **DepthOfField** *(Track E1)*
5. **Glitch** *(Track E1 — gated on `gestureGlitchActive`)*
6. **Scanline**
7. **Noise**
8. **Vignette**

Order matters: color/bloom distortions are computed before CRT-style scanline +
noise + vignette so the analog grain sits on top of the (already distorted)
image. Do not reorder without coordinating across tracks.

## Motion & performance guardrails

- Animate **transform / opacity only** — never `top`/`left`/`width`/`height`
  via CSS keyframes (reticle *placement* uses left/top per spec, but its
  pulse is transform/opacity).
- Custom cubic-beziers for chrome motion (e.g.
  `cubic-bezier(0.32, 0.72, 0, 1)` on the reticle pulse); no `linear`/`ease`
  for organic motion.
- **z-index discipline:** overlay chrome `z-10`, reticle `z-12` (within the
  overlay context), controls `z-20`, banners `z-40`, modals `z-50`. No
  arbitrary `z-[9999]`.
- `will-change` only on actively-animating elements.
